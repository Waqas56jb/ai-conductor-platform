import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { ReminderList, type ReminderItem } from "@/components/reminders/ReminderList";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("reminders"))("title") };
}

const RECENT_DAYS = 30;

/** The user's own reminders: meetings, calls, emails, tasks and follow-ups. */
export default async function RemindersPage() {
  const profile = await requireProfile();
  const t = await getTranslations("reminders");
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_reminders")
    .select("id, kind, title, notes, due_at, status, incident_id, quotation_id, invoice_id")
    .eq("user_id", profile.id)
    .gte("due_at", new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString())
    .order("due_at")
    .limit(200);

  const items: ReminderItem[] = (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    notes: r.notes,
    dueAt: r.due_at,
    status: r.status,
    href: r.incident_id
      ? `/app/cases/${r.incident_id}`
      : r.invoice_id
        ? "/app/invoices"
        : r.quotation_id
          ? "/app/quotes"
          : null,
  }));
  const open = items.filter((r) => r.status === "scheduled" || r.status === "sent");
  const past = items.filter((r) => !open.includes(r)).reverse();

  return (
    <div className="stack">
      <LiveRefresh
        channel="reminders"
        tables={[{ table: "ai_conductor_reminders", filter: `user_id=eq.${profile.id}` }]}
      />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <Card title={t("add")}>
        <ReminderForm />
      </Card>
      <Card title={t("upcoming")}>
        <ReminderList items={open} empty={t("emptyUpcoming")} />
      </Card>
      {past.length ? (
        <Card title={t("past")}>
          <ReminderList items={past} empty={t("emptyUpcoming")} />
        </Card>
      ) : null}
    </div>
  );
}
