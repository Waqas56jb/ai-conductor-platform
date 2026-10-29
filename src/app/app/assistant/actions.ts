"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { DEFAULT_AGENT, runAssistant } from "@/lib/ai/assistant/run";
import { TOOLS } from "@/lib/ai/assistant/tools";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { formValues, type FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validation/errors";

export type AssistantResult =
  { ok: true; conversationId: string } | { ok: false; error: string; conversationId?: string };

/** User messages per user in RATE_WINDOW_MS (each one may cost several model calls). */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const textSchema = z.string().trim().min(1).max(4000);

async function rateLimited(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from("ai_conductor_ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .gte("updated_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  const ids = (conversations ?? []).map((c) => c.id);
  if (!ids.length) return false;
  const { count } = await admin
    .from("ai_conductor_ai_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user")
    .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  return (count ?? 0) >= RATE_LIMIT;
}

export async function sendAssistantMessage(
  conversationId: string | null,
  input: string,
): Promise<AssistantResult> {
  const profile = await requireProfile();
  const text = textSchema.safeParse(input);
  if (!text.success) return { ok: false, error: "assistant.errors.empty" };
  if (await rateLimited(profile.id)) return { ok: false, error: "assistant.errors.rateLimited" };

  const admin = createAdminClient();
  let id = conversationId;
  if (id) {
    const { data } = await admin
      .from("ai_conductor_ai_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", profile.id)
      .is("archived_at", null)
      .maybeSingle();
    if (!data) return { ok: false, error: "assistant.errors.notFound" };
  } else {
    const { data, error } = await admin
      .from("ai_conductor_ai_conversations")
      .insert({
        company_id: profile.company_id,
        user_id: profile.id,
        title: text.data.slice(0, 80),
        channel: "chat",
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "common.error" };
    id = data.id;
  }

  const [{ data: agent }, { data: company }] = await Promise.all([
    admin
      .from("ai_conductor_agent_profiles")
      .select("assistant_name, tone, language, instructions")
      .eq("user_id", profile.id)
      .maybeSingle(),
    admin.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
  ]);

  try {
    await runAssistant({
      profile,
      conversationId: id,
      agent: agent ?? DEFAULT_AGENT,
      companyName: company?.name ?? "",
      text: text.data,
    });
  } catch (e) {
    console.error("[assistant] run failed", e);
    return { ok: false, error: "assistant.errors.failed", conversationId: id };
  } finally {
    await admin
      .from("ai_conductor_ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath("/app/assistant");
  }
  return { ok: true, conversationId: id };
}

/** The user approves or rejects a proposal; approved ones run as the user. */
export async function decideAiAction(
  actionId: string,
  approve: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(actionId).success)
    return { ok: false, error: "assistant.errors.notFound" };
  const admin = createAdminClient();
  const { data: action } = await admin
    .from("ai_conductor_ai_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!action) return { ok: false, error: "assistant.errors.notFound" };
  if (action.status !== "pending") return { ok: false, error: "assistant.errors.alreadyDecided" };

  const now = new Date().toISOString();
  const expired = action.expires_at !== null && action.expires_at < now;
  // Guarded on "pending": a double click cannot run the action twice.
  const { data: claimed } = await admin
    .from("ai_conductor_ai_actions")
    .update({
      status: expired ? "expired" : approve ? "approved" : "rejected",
      decided_by: profile.id,
      decided_at: now,
    })
    .eq("id", action.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return { ok: false, error: "assistant.errors.alreadyDecided" };
  revalidatePath("/app/assistant");
  if (expired) return { ok: false, error: "assistant.errors.expired" };

  const t = await getTranslations({ locale: profile.locale, namespace: "assistant" });
  const note = async (text: string) => {
    if (!action.conversation_id) return;
    await admin.from("ai_conductor_ai_messages").insert({
      company_id: profile.company_id,
      conversation_id: action.conversation_id,
      role: "assistant",
      content: { text },
    });
  };

  if (!approve) {
    await Promise.all([
      audit(
        profile,
        "ai.action_rejected",
        { type: "ai_action", id: action.id },
        { tool: action.tool },
      ),
      note(t("notes.rejected", { summary: action.summary })),
    ]);
    return { ok: true };
  }

  const def = TOOLS[action.tool];
  const parsed = def?.kind === "write" ? def.schema.safeParse(action.input) : null;
  const result =
    def?.kind === "write" && parsed?.success
      ? await def.execute(parsed.data as never).catch((e: unknown) => {
          console.error(`[assistant] ${action.tool} failed`, e);
          return { ok: false as const, error: "common.error" };
        })
      : { ok: false as const, error: "common.error" };

  await Promise.all([
    admin
      .from("ai_conductor_ai_actions")
      .update(
        result.ok
          ? { status: "executed", executed_at: new Date().toISOString(), result: { ok: true } }
          : { status: "failed", error: result.error },
      )
      .eq("id", action.id),
    audit(
      profile,
      result.ok ? "ai.action_executed" : "ai.action_failed",
      { type: "ai_action", id: action.id },
      { tool: action.tool, input: action.input, ...(result.ok ? {} : { error: result.error }) },
    ),
    note(
      result.ok
        ? t("notes.executed", { summary: action.summary })
        : t("notes.failed", { summary: action.summary }),
    ),
  ]);
  revalidatePath("/app", "layout");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function archiveConversation(id: string): Promise<void> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return;
  await createAdminClient()
    .from("ai_conductor_ai_conversations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", profile.id);
  revalidatePath("/app/assistant");
  redirect("/app/assistant");
}

const agentSchema = z.object({
  assistantName: z.string().trim().min(1, { error: "required" }).max(40, { error: "tooLong" }),
  tone: z.enum(["professional", "friendly", "concise"], { error: "required" }),
  language: z.enum(["fr", "en"], { error: "required" }),
  instructions: z.string().trim().max(2000, { error: "tooLong" }),
});

export async function updateAgentProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const values = formValues(formData, ["assistantName", "tone", "language", "instructions"]);
  const parsed = agentSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { error } = await createAdminClient().from("ai_conductor_agent_profiles").upsert({
    user_id: profile.id,
    company_id: profile.company_id,
    assistant_name: parsed.data.assistantName,
    tone: parsed.data.tone,
    language: parsed.data.language,
    instructions: parsed.data.instructions,
  });
  if (error) return { status: "error", message: "common.error", values };
  await audit(profile, "ai.agent_profile_updated", { type: "user", id: profile.id });
  revalidatePath("/app/assistant");
  return { status: "success", message: "common.saved", values };
}
