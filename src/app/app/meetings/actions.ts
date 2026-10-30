"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTask } from "@/app/app/tasks/actions";
import { summarizeMeeting } from "@/lib/ai/meeting";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { voiceProvider } from "@/lib/voice/provider";

type Result<T = object> =
  ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Under the server-action body limit (next.config) and OpenAI's 25 MB. */
const MAX_AUDIO_BYTES = 14 * 1024 * 1024;

const meetingSchema = z.object({
  title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
  participants: z.string().trim().max(1000, { error: "tooLong" }),
  heldAt: z.iso.datetime({ offset: true, error: "required" }),
  notes: z.string().trim().max(100_000, { error: "tooLong" }),
});

/**
 * Writes up a meeting from typed notes or a recording (transcribed first):
 * summary, decisions and action items. Nothing becomes a task here.
 */
export async function createMeeting(formData: FormData): Promise<Result<{ id: string }>> {
  const profile = await requireProfile();
  if (profile.role === "client") return { ok: false, error: "common.forbidden" };
  const str = (k: string) =>
    typeof formData.get(k) === "string" ? (formData.get(k) as string) : "";
  const parsed = meetingSchema.safeParse({
    title: str("title"),
    participants: str("participants"),
    heldAt: str("heldAt"),
    notes: str("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "meetings.errors.invalid", fieldErrors };
  }
  const audio = formData.get("audio");
  const hasAudio = audio instanceof Blob && audio.size > 0;
  if (hasAudio && (audio.size > MAX_AUDIO_BYTES || !audio.type.startsWith("audio/")))
    return { ok: false, error: "meetings.errors.audio", fieldErrors: { audio: "audio" } };
  if (!hasAudio && parsed.data.notes.length < 20)
    return { ok: false, error: "meetings.errors.empty", fieldErrors: { notes: "required" } };

  let transcript = parsed.data.notes;
  try {
    if (hasAudio) transcript = await voiceProvider().transcribe(audio, profile.locale);
    if (!transcript.trim()) return { ok: false, error: "meetings.errors.notHeard" };
    const summary = await summarizeMeeting({ ...parsed.data, transcript });
    const { data, error } = await createAdminClient()
      .from("ai_conductor_meetings")
      .insert({
        company_id: profile.company_id,
        title: parsed.data.title,
        participants: parsed.data.participants,
        held_at: parsed.data.heldAt,
        source: hasAudio ? "audio" : "notes",
        transcript,
        summary: summary.summary,
        decisions: summary.decisions,
        actions: summary.actions,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "common.error" };
    await audit(
      profile,
      "meeting.summarized",
      { type: "meeting", id: data.id },
      {
        source: hasAudio ? "audio" : "notes",
        actions: summary.actions.length,
      },
    );
    revalidatePath("/app/meetings");
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[meetings] summary failed", e);
    return { ok: false, error: "meetings.errors.failed" };
  }
}

/** The action items the user picked become tasks (confirmed in the UI). */
export async function createTasksFromMeeting(
  meetingId: string,
  picks: { index: number; assigneeId: string }[],
): Promise<Result<{ created: number }>> {
  await requireProfile();
  if (!z.uuid().safeParse(meetingId).success || !picks.length)
    return { ok: false, error: "meetings.errors.notFound" };
  // RLS: only a meeting the user can see.
  const { data: meeting } = await (
    await createClient()
  )
    .from("ai_conductor_meetings")
    .select("id, actions, incident_id")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) return { ok: false, error: "meetings.errors.notFound" };
  let created = 0;
  for (const pick of picks) {
    const action = meeting.actions[pick.index];
    if (!action) continue;
    const r = await createTask(
      {
        title: action.title,
        description: "",
        priority: "normal",
        // Due dates are days: 9:00 Paris time.
        dueAt: action.due ? new Date(`${action.due}T09:00:00+01:00`).toISOString() : "",
        assigneeId: pick.assigneeId,
        incidentId: meeting.incident_id ?? "",
      },
      "meeting",
      meeting.id,
    );
    if (r.ok) created++;
  }
  revalidatePath(`/app/meetings/${meetingId}`);
  return created ? { ok: true, created } : { ok: false, error: "common.error" };
}

export async function deleteMeeting(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "meetings.errors.notFound" };
  let query = createAdminClient()
    .from("ai_conductor_meetings")
    .delete()
    .eq("id", id)
    .eq("company_id", profile.company_id);
  if (!["manager", "director", "admin"].includes(profile.role))
    query = query.eq("created_by", profile.id);
  const { data } = await query.select("id");
  if (!data?.length) return { ok: false, error: "meetings.errors.notFound" };
  await audit(profile, "meeting.deleted", { type: "meeting", id });
  revalidatePath("/app/meetings");
  return { ok: true };
}
