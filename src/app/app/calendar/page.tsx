import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "./calendar.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("calendar"))("title") };
}

/** "2026-10" → first day of that month (local), defaulting to the current month. */
function parseMonth(value: string | undefined): Date {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  return m
    ? new Date(Number(m[1]), Number(m[2]) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
}

const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireRole(["manager", "director", "admin", "technician"]);
  const [t, ti, format] = await Promise.all([
    getTranslations("calendar"),
    getTranslations("cases.intervention.statuses"),
    getFormatter(),
  ]);
  const month = parseMonth((await searchParams).month);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);

  // RLS: technicians only see the interventions of their own cases.
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_interventions")
    .select("id, incident_id, scheduled_at, status, building_address")
    .gte("scheduled_at", month.toISOString())
    .lt("scheduled_at", next.toISOString())
    .neq("status", "cancelled")
    .order("scheduled_at");
  const items = data ?? [];
  const incidentIds = items.flatMap((it) => (it.incident_id ? [it.incident_id] : []));
  const { data: refs } = incidentIds.length
    ? await supabase.from("ai_conductor_incidents").select("id, reference").in("id", incidentIds)
    : { data: [] as { id: string; reference: string }[] };
  const reference = new Map((refs ?? []).map((r) => [r.id, r.reference]));
  const refOf = (id: string | null) => (id ? (reference.get(id) ?? "") : "");
  const byDay = new Map<string, typeof items>();
  for (const it of items) {
    if (!it.scheduled_at) continue;
    const k = dayKey(new Date(it.scheduled_at));
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }

  // Monday-first grid covering the whole month.
  const offset = (month.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  const days = Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
  const weeks = days[35].getMonth() !== month.getMonth() ? days.slice(0, 35) : days;
  const weekdays = days.slice(0, 7).map((d) => format.dateTime(d, { weekday: "short" }));
  const today = dayKey(new Date());

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{profile.role === "director" ? t("titleInterventions") : t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        <div className={styles.nav}>
          <Link
            href={`/app/calendar?month=${monthParam(prev)}`}
            className={buttonClass({ variant: "secondary", size: "sm" })}
            aria-label={t("previous")}
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
          <h2 className={styles.month}>
            {format.dateTime(month, { month: "long", year: "numeric" })}
          </h2>
          <Link
            href={`/app/calendar?month=${monthParam(next)}`}
            className={buttonClass({ variant: "secondary", size: "sm" })}
            aria-label={t("next")}
          >
            <ChevronRight aria-hidden="true" />
          </Link>
          <Link href="/app/calendar" className={buttonClass({ variant: "ghost", size: "sm" })}>
            {t("today")}
          </Link>
        </div>
      </div>

      <Card flush>
        <div
          className={styles.grid}
          role="grid"
          aria-label={format.dateTime(month, { month: "long", year: "numeric" })}
        >
          {weekdays.map((w) => (
            <div key={w} className={styles.weekday} role="columnheader">
              {w}
            </div>
          ))}
          {weeks.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            return (
              <div
                key={k}
                role="gridcell"
                className={`${styles.day} ${d.getMonth() !== month.getMonth() ? styles.outside : ""} ${k === today ? styles.today : ""}`}
              >
                <span className={styles.date}>{d.getDate()}</span>
                {list.map((it) => (
                  <Link key={it.id} href={`/app/cases/${it.incident_id}`} className={styles.event}>
                    {format.dateTime(new Date(it.scheduled_at as string), { timeStyle: "short" })} ·{" "}
                    {refOf(it.incident_id)}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title={t("listTitle")}>
        {items.length ? (
          <ul className={styles.list}>
            {items.map((it) => (
              <li key={it.id}>
                <Link href={`/app/cases/${it.incident_id}`}>
                  <strong>
                    {format.dateTime(new Date(it.scheduled_at as string), {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </strong>
                  <span>
                    {refOf(it.incident_id)} · {it.building_address}
                  </span>
                </Link>
                <Badge tone="info">{ti(it.status)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarX />} title={t("empty")} />
        )}
      </Card>
    </div>
  );
}
