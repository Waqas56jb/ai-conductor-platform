import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { NewMeetingForm } from "@/components/meetings/NewMeetingForm";
import { Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/meetings/meetings.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("title") };
}

/** Meeting summaries: notes or a recording in, summary, decisions and actions out. */
export default async function MeetingsPage() {
  await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const [t, format] = await Promise.all([getTranslations("meetings"), getFormatter()]);
  const { data } = await (
    await createClient()
  )
    .from("ai_conductor_meetings")
    .select("id, title, held_at, source, actions, summary")
    .order("held_at", { ascending: false })
    .limit(100);
  const meetings = data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <Card title={t("new")} description={t("newHint")}>
        <NewMeetingForm />
      </Card>
      <Card title={t("history")} flush>
        {meetings.length ? (
          <ul className={styles.list}>
            {meetings.map((m) => (
              <li key={m.id}>
                <Link href={`/app/meetings/${m.id}`}>
                  <strong>{m.title}</strong>
                  <span className={styles.meta}>
                    {format.dateTime(new Date(m.held_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {t(`source.${m.source}`)} · {t("actionsCount", { count: m.actions.length })}
                  </span>
                  <span className={styles.excerpt}>{m.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<NotebookPen />} title={t("empty")} />
        )}
      </Card>
    </div>
  );
}
