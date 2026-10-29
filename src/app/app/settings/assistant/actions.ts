"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEFAULT_ASSISTANT } from "@/lib/assistant/defaults";
import { getAssistantSettings } from "@/lib/ai/assistant/session";
import { audit } from "@/lib/audit";
import { COMPANY_ADMIN_ROLES, hasRole } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import {
  ASSISTANT_TONES,
  ASSISTANT_VOICES,
  AVATAR_TYPES,
  MEMORY_KINDS,
  THEME_COLORS,
} from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

const settingsSchema = z
  .object({
    display_name: z.string().trim().min(1).max(40),
    avatar_type: z.enum(AVATAR_TYPES),
    voice: z.enum(ASSISTANT_VOICES),
    tone: z.enum(ASSISTANT_TONES),
    language: z.enum(["fr", "en"]),
    context_aware_tone: z.boolean(),
    theme_color: z.enum(THEME_COLORS).nullable(),
  })
  .partial()
  .strict();

export type AssistantSettingsPatch = z.input<typeof settingsSchema>;

/** Saves one or more assistant settings of the signed-in user (each control saves on change). */
export async function updateAssistantSettings(patch: AssistantSettingsPatch): Promise<Result> {
  const profile = await requireProfile();
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success || !Object.keys(parsed.data).length)
    return { ok: false, error: "assistant.settings.invalid" };
  const current = await getAssistantSettings();
  const { error } = await createAdminClient()
    .from("ai_conductor_assistant_profiles")
    .upsert({
      ...DEFAULT_ASSISTANT,
      ...current,
      ...parsed.data,
      user_id: profile.id,
      company_id: profile.company_id,
    });
  if (error) return { ok: false, error: "common.error" };
  await audit(profile, "assistant.settings_updated", { type: "user", id: profile.id }, parsed.data);
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Company default colour (directors and admins); users without their own colour follow it. */
export async function setCompanyTheme(color: string): Promise<Result> {
  const profile = await requireProfile();
  if (!hasRole(profile.role, COMPANY_ADMIN_ROLES)) return { ok: false, error: "common.forbidden" };
  const parsed = z.enum(THEME_COLORS).safeParse(color);
  if (!parsed.success) return { ok: false, error: "assistant.settings.invalid" };
  const { error } = await createAdminClient().from("ai_conductor_company_themes").upsert({
    company_id: profile.company_id,
    primary_color: parsed.data,
    updated_by: profile.id,
  });
  if (error) return { ok: false, error: "common.error" };
  await audit(
    profile,
    "company.theme_updated",
    { type: "company", id: profile.company_id },
    { primary_color: parsed.data },
  );
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------- memories & rules ----------

const contentSchema = z.string().trim().min(1).max(500);

/** A memory the user writes is approved by definition. */
export async function addMemory(kind: string, content: string): Promise<Result> {
  const profile = await requireProfile();
  const k = z.enum(MEMORY_KINDS).safeParse(kind);
  const c = contentSchema.safeParse(content);
  if (!k.success || !c.success) return { ok: false, error: "assistant.settings.invalid" };
  const { data, error } = await createAdminClient()
    .from("ai_conductor_assistant_memories")
    .insert({
      user_id: profile.id,
      company_id: profile.company_id,
      kind: k.data,
      content: c.data,
      approved: true,
      source: "user",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "common.error" };
  await audit(
    profile,
    "assistant.memory_added",
    { type: "assistant_memory", id: data.id },
    { kind: k.data },
  );
  revalidatePath("/app/settings/assistant");
  return { ok: true };
}

/** Edits a memory; editing an assistant suggestion also approves it. */
export async function updateMemory(id: string, content: string): Promise<Result> {
  const profile = await requireProfile();
  const c = contentSchema.safeParse(content);
  if (!z.uuid().safeParse(id).success || !c.success)
    return { ok: false, error: "assistant.settings.invalid" };
  return finish(profile, id, "assistant.memory_updated", (t) =>
    t
      .update({ content: c.data, approved: true })
      .eq("id", id)
      .eq("user_id", profile.id)
      .select("id"),
  );
}

export async function approveMemory(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "assistant.settings.invalid" };
  return finish(profile, id, "assistant.memory_approved", (t) =>
    t.update({ approved: true }).eq("id", id).eq("user_id", profile.id).select("id"),
  );
}

export async function deleteMemory(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "assistant.settings.invalid" };
  return finish(profile, id, "assistant.memory_deleted", (t) =>
    t.delete().eq("id", id).eq("user_id", profile.id).select("id"),
  );
}

/** "Tout effacer": every memory and rule of the user. */
export async function clearMemories(): Promise<Result> {
  const profile = await requireProfile();
  const { data, error } = await createAdminClient()
    .from("ai_conductor_assistant_memories")
    .delete()
    .eq("user_id", profile.id)
    .select("id");
  if (error) return { ok: false, error: "common.error" };
  await audit(
    profile,
    "assistant.memories_cleared",
    { type: "user", id: profile.id },
    { count: data?.length ?? 0 },
  );
  revalidatePath("/app/settings/assistant");
  return { ok: true };
}

const memories = () => createAdminClient().from("ai_conductor_assistant_memories");

/** Runs a change scoped to one of the user's own memories, then audits it. */
async function finish(
  profile: Awaited<ReturnType<typeof requireProfile>>,
  id: string,
  action: string,
  change: (
    table: ReturnType<typeof memories>,
  ) => PromiseLike<{ data: { id: string }[] | null; error: unknown }>,
): Promise<Result> {
  const { data, error } = await change(memories());
  if (error) return { ok: false, error: "common.error" };
  if (!data?.length) return { ok: false, error: "assistant.settings.notFound" };
  await audit(profile, action, { type: "assistant_memory", id });
  revalidatePath("/app/settings/assistant");
  return { ok: true };
}
