import "server-only";
import { randomBytes } from "node:crypto";
import type { DemoRequestRow, SiteEventRow } from "@/lib/db/types";
import { sendMail } from "@/lib/email/transactional";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmedEmail, inviteText, receivedEmail, teamEmail } from "./emails";
import { demoInvite } from "./ics";
import type { DemoRequestInput } from "./schema";
import { freeSlots, isBookable } from "./slots";

const MAX_REQUESTS_PER_EMAIL_PER_DAY = 3;

export async function recordEvent(event: Partial<Omit<SiteEventRow, "id" | "created_at">> & Pick<SiteEventRow, "name">) {
  await createAdminClient().from("ai_conductor_site_events").insert(event);
}

async function takenSlots(now: Date) {
  const { data } = await createAdminClient()
    .from("ai_conductor_demo_requests")
    .select("slot_start")
    .neq("status", "cancelled")
    .gte("slot_start", now.toISOString());
  return (data ?? []).map((r) => r.slot_start);
}

export async function availableSlots(now = new Date()) {
  return freeSlots(now, await takenSlots(now));
}

export const manageUrl = (token: string) => `${env.NEXT_PUBLIC_APP_URL}/demo/${token}`;

export type BookingResult =
  | { ok: true; slot: string; emailed: boolean }
  | { ok: false; error: "slot_unavailable" | "too_many" };

export async function bookDemo(input: DemoRequestInput, now = new Date()): Promise<BookingResult> {
  const db = createAdminClient();
  if (!isBookable(input.slot, now)) return { ok: false, error: "slot_unavailable" };

  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const { count } = await db
    .from("ai_conductor_demo_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", input.email)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_DAY) return { ok: false, error: "too_many" };

  const { data: row, error } = await db
    .from("ai_conductor_demo_requests")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      sector: input.sector ?? null,
      message: input.message ?? null,
      slot_start: new Date(input.slot).toISOString(),
      token: randomBytes(24).toString("base64url"),
      locale: input.locale,
      source: input.source ?? null,
      medium: input.medium ?? null,
      campaign: input.campaign ?? null,
      consent_at: now.toISOString(),
    })
    .select()
    .single();
  // 23505: the slot was taken in the meantime (unique index on live slots).
  if (error?.code === "23505") return { ok: false, error: "slot_unavailable" };
  if (error || !row) throw error ?? new Error("demo request insert");

  await recordEvent({
    name: "demo_submit",
    page: "demo",
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
  });

  const toProspect = receivedEmail(row);
  const toTeam = teamEmail(row, manageUrl(row.token));
  const [emailed] = await Promise.all([
    sendMail({ to: row.email, replyTo: env.DEMO_INBOX, ...toProspect }),
    sendMail({ to: env.DEMO_INBOX, replyTo: row.email, ...toTeam }),
  ]);
  return { ok: true, slot: row.slot_start, emailed };
}

export async function requestByToken(token: string): Promise<DemoRequestRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("ai_conductor_demo_requests")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return data;
}

/** Team action: confirms a requested demo and sends the invitation. */
export async function confirmDemo(token: string): Promise<DemoRequestRow | null> {
  const db = createAdminClient();
  const { data: row } = await db
    .from("ai_conductor_demo_requests")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("token", token)
    .eq("status", "requested")
    .select()
    .maybeSingle();
  if (!row) return null;

  await recordEvent({
    name: "demo_confirmed",
    page: "demo",
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
  });
  const mail = confirmedEmail(row);
  const invite = demoInvite({
    id: row.id,
    start: row.slot_start,
    ...inviteText(row.locale),
    organizer: env.DEMO_INBOX,
    attendee: row.email,
  });
  await sendMail({
    to: row.email,
    replyTo: env.DEMO_INBOX,
    ...mail,
    attachments: [{ filename: "demo-pratonna.ics", content: invite, contentType: "text/calendar" }],
  });
  return row;
}

/** Team action: cancels a demo and frees its slot. */
export async function cancelDemo(token: string): Promise<DemoRequestRow | null> {
  const { data } = await createAdminClient()
    .from("ai_conductor_demo_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("token", token)
    .neq("status", "cancelled")
    .select()
    .maybeSingle();
  return data;
}
