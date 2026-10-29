"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { TOOLS } from "@/lib/ai/assistant/tools";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

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
