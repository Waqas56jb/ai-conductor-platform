import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { notify } from "@/lib/notify";
import { REMINDER_SOURCE } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/** Due reminders handled per run; the rest wait for the next one. */
const BATCH = 100;

function authorized(request: NextRequest): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Vercel Cron: fires due reminders as urgent in-app notifications, pushed to
 * the user's browsers. Each reminder is claimed first, so overlapping runs
 * never send one twice.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: due } = await admin
    .from("ai_conductor_reminders")
    .select("id, company_id, user_id, kind, title, notes, incident_id, quotation_id, invoice_id")
    .eq("status", "scheduled")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(BATCH);

  let sent = 0;
  for (const r of due ?? []) {
    const { data: claimed } = await admin
      .from("ai_conductor_reminders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", r.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed?.length) continue;
    await notify({
      companyId: r.company_id,
      userIds: [r.user_id],
      type: "reminder",
      title: r.title,
      body: r.notes || undefined,
      source: REMINDER_SOURCE[r.kind],
      priority: "urgent",
      incidentId: r.incident_id ?? undefined,
      quotationId: r.quotation_id ?? undefined,
      invoiceId: r.invoice_id ?? undefined,
      push: { url: r.incident_id ? `/app/cases/${r.incident_id}` : "/app/reminders", tag: r.id },
    });
    sent++;
  }
  return NextResponse.json({ sent });
}
