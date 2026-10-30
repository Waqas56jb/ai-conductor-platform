import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { MeetingActions } from "@/components/meetings/MeetingActions";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/meetings/meetings.module.css";
import caseStyles from "@/components/cases/cases.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("meetings"))("title") };
}

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const { id } = await params;
  const [t, format] = await Promise.all([getTranslations("meetings"), getFormatter()]);
  const supabase = await createClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: meeting }, { data: team }, { data: tasks }] = await Promise.all([
    supabase.from("ai_conductor_meetings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("ai_conductor_users")
      .select("id, display_name, email")
      .neq("role", "client")
      .eq("active", true)
      .order("display_name"),
    supabase.from("ai_conductor_team_tasks").select("title").eq("meeting_id", id),
  ]);
  if (!meeting) notFound();
  const created = new Set((tasks ?? []).map((x) => x.title));

  return (
    <div className="stack">
      <div>
        <Link href="/app/meetings" className={caseStyles.back}>
          <ArrowLeft aria-hidden="true" />
          {t("back")}
        </Link>
        <div className="page-header">
          <div>
            <h1>{meeting.title}</h1>
            <p>
              {format.dateTime(new Date(meeting.held_at), {
                dateStyle: "full",
                timeStyle: "short",
              })}
              {meeting.participants ? ` · ${meeting.participants}` : ""}
            </p>
          </div>
        </div>
      </div>
      <Card title={t("summary")}>
        <p className={styles.summary}>{meeting.summary}</p>
      </Card>
      {meeting.decisions.length ? (
        <Card title={t("decisions")}>
          <ul className={styles.bullets}>
            {meeting.decisions.map((d, i) => (
              <li key={i}>{d.text}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card title={t("actions")} description={t("actionsHint")}>
        <MeetingActions
          meetingId={meeting.id}
          actions={meeting.actions.map((a) => ({ ...a, created: created.has(a.title) }))}
          members={(team ?? []).map((m) => ({ id: m.id, name: m.display_name || m.email }))}
          meId={profile.id}
          canDelete={
            meeting.created_by === profile.id ||
            ["manager", "director", "admin"].includes(profile.role)
          }
        />
      </Card>
      <Card>
        <details>
          <summary className={styles.transcriptToggle}>
            {t(meeting.source === "audio" ? "transcript" : "notes")}
          </summary>
          <p className={styles.transcript}>{meeting.transcript}</p>
        </details>
      </Card>
    </div>
  );
}
