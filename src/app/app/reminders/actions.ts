"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireProfile, type Profile } from "@/lib/auth/session";
import {
  reminderEntitySchema,
  reminderSchema,
  type ReminderEntity,
  type ReminderInput,
} from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/errors";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const ENTITY_TABLE = {
  incident: "ai_conductor_incidents",
  quotation: "ai_conductor_quotations",
  invoice: "ai_conductor_invoices",
} as const;
const ENTITY_COLUMN = {
  incident: "incident_id",
  quotation: "quotation_id",
  invoice: "invoice_id",
} as const;

/**
 * Schedules a reminder for the signed-in user, optionally about a case, a
 * quote or an invoice they can see. Shared with the assistant (after approval).
 */
export async function createReminder(
  input: ReminderInput,
  entity: ReminderEntity | null = null,
  via: "app" | "assistant" = "app",
): Promise<Result> {
  const profile = await requireProfile();
  return scheduleReminder(profile, input, entity, via);
}

async function scheduleReminder(
  profile: Profile,
  input: ReminderInput,
  entity: ReminderEntity | null,
  via: "app" | "assistant",
): Promise<Result> {
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "common.error", fieldErrors: fieldErrors(parsed.error) };
  const due = new Date(parsed.data.dueAt);
  if (due.getTime() < Date.now() - 60_000)
    return { ok: false, error: "reminders.errors.past", fieldErrors: { dueAt: "past" } };

  let link: Partial<Record<(typeof ENTITY_COLUMN)[keyof typeof ENTITY_COLUMN], string>> = {};
  if (entity) {
    const e = reminderEntitySchema.safeParse(entity);
    if (!e.success) return { ok: false, error: "reminders.errors.notFound" };
    // RLS: the user must be able to see what the reminder is about.
    const supabase = await createClient();
    const { data } = await supabase
      .from(ENTITY_TABLE[e.data.type])
      .select("id")
      .eq("id", e.data.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "reminders.errors.notFound" };
    link = { [ENTITY_COLUMN[e.data.type]]: e.data.id };
  }

  const { data, error } = await createAdminClient()
    .from("ai_conductor_reminders")
    .insert({
      company_id: profile.company_id,
      user_id: profile.id,
      created_by: profile.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      notes: parsed.data.notes,
      due_at: due.toISOString(),
      created_via: via,
      ...link,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "common.error" };
  await audit(
    profile,
    "reminder.created",
    { type: "reminder", id: data.id },
    {
      kind: parsed.data.kind,
      due_at: due.toISOString(),
      via,
    },
  );
  revalidatePath("/app/reminders");
  return { ok: true };
}

async function updateOwn(id: string, patch: { status: "done" | "cancelled" }, action: string) {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success)
    return { ok: false as const, error: "reminders.errors.notFound" };
  const { data } = await createAdminClient()
    .from("ai_conductor_reminders")
    .update(patch)
    .eq("id", id)
    .eq("user_id", profile.id)
    .in("status", ["scheduled", "sent"])
    .select("id");
  if (!data?.length) return { ok: false as const, error: "reminders.errors.notFound" };
  await audit(profile, action, { type: "reminder", id });
  revalidatePath("/app/reminders");
  return { ok: true as const };
}

export async function completeReminder(id: string): Promise<Result> {
  return updateOwn(id, { status: "done" }, "reminder.done");
}

/** Cancelling is the user's "delete": confirmed in the UI first. */
export async function cancelReminder(id: string): Promise<Result> {
  return updateOwn(id, { status: "cancelled" }, "reminder.cancelled");
}
