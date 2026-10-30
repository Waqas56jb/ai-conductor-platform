"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { notify } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Error messages are keys of the "validation" namespace.
const taskSchema = z.object({
  title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
  description: z.string().trim().max(2000, { error: "tooLong" }).default(""),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  dueAt: z.iso.datetime({ offset: true }).or(z.literal("")).nullish(),
  assigneeId: z.uuid().or(z.literal("")).nullish(),
  incidentId: z
    .string()
    .regex(/^INC-[A-Z0-9-]{4,40}$/)
    .or(z.literal(""))
    .nullish(),
});
export type TaskInput = z.input<typeof taskSchema>;

/**
 * A task for the team (not clients). Shared by the tasks page, the assistant
 * (after approval) and meeting action items.
 */
export async function createTask(
  input: TaskInput,
  source: "manual" | "assistant" | "meeting" = "manual",
  meetingId: string | null = null,
): Promise<Result> {
  const profile = await requireProfile();
  if (profile.role === "client") return { ok: false, error: "common.forbidden" };
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "tasks.errors.invalid", fieldErrors };
  }
  const t = parsed.data;
  const admin = createAdminClient();
  if (t.assigneeId) {
    const { data: member } = await admin
      .from("ai_conductor_users")
      .select("id")
      .eq("id", t.assigneeId)
      .eq("company_id", profile.company_id)
      .neq("role", "client")
      .eq("active", true)
      .maybeSingle();
    if (!member)
      return { ok: false, error: "tasks.errors.assignee", fieldErrors: { assigneeId: "required" } };
  }
  if (meetingId) {
    const { data: meeting } = await admin
      .from("ai_conductor_meetings")
      .select("id")
      .eq("id", meetingId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (!meeting) return { ok: false, error: "meetings.errors.notFound" };
  }
  if (t.incidentId) {
    // RLS: only a case the user can see.
    const { data: visible } = await (
      await createClient()
    )
      .from("ai_conductor_incidents")
      .select("id")
      .eq("id", t.incidentId)
      .maybeSingle();
    if (!visible) return { ok: false, error: "cases.errors.notFound" };
  }
  const { data, error } = await admin
    .from("ai_conductor_team_tasks")
    .insert({
      company_id: profile.company_id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_at: t.dueAt || null,
      assignee_id: t.assigneeId || null,
      incident_id: t.incidentId || null,
      meeting_id: meetingId,
      source,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "common.error" };
  await audit(profile, "task.created", { type: "team_task", id: data.id }, { source });
  if (t.assigneeId && t.assigneeId !== profile.id)
    await notify({
      companyId: profile.company_id,
      userIds: [t.assigneeId],
      type: "task",
      source: "task",
      title: `Nouvelle tâche : ${t.title}`,
      body: profile.display_name,
      incidentId: t.incidentId || undefined,
    });
  revalidatePath("/app/tasks");
  return { ok: true };
}

const STATUS = z.enum(["todo", "in_progress", "done"]);

export async function setTaskStatus(id: string, status: string): Promise<Result> {
  const profile = await requireProfile();
  const s = STATUS.safeParse(status);
  if (profile.role === "client" || !z.uuid().safeParse(id).success || !s.success)
    return { ok: false, error: "tasks.errors.notFound" };
  const { data } = await createAdminClient()
    .from("ai_conductor_team_tasks")
    .update({ status: s.data, completed_at: s.data === "done" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .select("id");
  if (!data?.length) return { ok: false, error: "tasks.errors.notFound" };
  await audit(profile, "task.status_changed", { type: "team_task", id }, { status: s.data });
  revalidatePath("/app/tasks");
  return { ok: true };
}

/** Deleting is confirmed in the UI; only its author or the office may delete a task. */
export async function deleteTask(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "tasks.errors.notFound" };
  const admin = createAdminClient();
  let query = admin
    .from("ai_conductor_team_tasks")
    .delete()
    .eq("id", id)
    .eq("company_id", profile.company_id);
  if (!["manager", "director", "admin"].includes(profile.role))
    query = query.eq("created_by", profile.id);
  const { data } = await query.select("id");
  if (!data?.length) return { ok: false, error: "tasks.errors.notFound" };
  await audit(profile, "task.deleted", { type: "team_task", id });
  revalidatePath("/app/tasks");
  return { ok: true };
}
