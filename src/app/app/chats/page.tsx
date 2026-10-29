import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "../team.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("chats"))("title") };
}

export default async function ChatsPage() {
  await requireRole(["manager", "director", "admin", "technician"]);
  const [t, format] = await Promise.all([getTranslations("chats"), getFormatter()]);
  const supabase = await createClient();

  // RLS: office sees every team group, technicians only their own.
  const { data: groups } = await supabase
    .from("ai_conductor_task_groups")
    .select("id, incident_id, member_ids, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (groups ?? []).map((g) => g.id);
  const incidentIds = (groups ?? []).flatMap((g) => (g.incident_id ? [g.incident_id] : []));
  const [{ data: messages }, { data: incidents }] = await Promise.all([
    ids.length
      ? supabase
          .from("ai_conductor_group_messages")
          .select("group_id, text, from_name, created_at")
          .in("group_id", ids)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({
          data: [] as {
            group_id: string;
            text: string;
            from_name: string | null;
            created_at: string;
          }[],
        }),
    incidentIds.length
      ? supabase.from("ai_conductor_incidents").select("id, reference, title").in("id", incidentIds)
      : Promise.resolve({ data: [] as { id: string; reference: string; title: string }[] }),
  ]);
  const last = new Map<string, { text: string; from_name: string | null; created_at: string }>();
  for (const m of messages ?? []) if (!last.has(m.group_id)) last.set(m.group_id, m);
  const cases = new Map((incidents ?? []).map((i) => [i.id, i]));

  return (
    <div className="stack">
      <LiveRefresh channel="chats" tables={[{ table: "ai_conductor_group_messages" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <Card flush>
        {groups?.length ? (
          <ul className={styles.list}>
            {groups.map((g) => {
              const m = last.get(g.id);
              return (
                <li key={g.id} className={styles.item}>
                  <Link href={`/app/cases/${g.incident_id}#team-chat`}>
                    <strong>{cases.get(g.incident_id ?? "")?.title ?? "—"}</strong>
                  </Link>
                  <span className={styles.muted}>
                    {cases.get(g.incident_id ?? "")?.reference} ·{" "}
                    {t("members", { count: g.member_ids.length })}
                  </span>
                  {m ? (
                    <span className={styles.muted}>
                      {m.from_name} : {m.text.slice(0, 120)} —{" "}
                      {format.relativeTime(new Date(m.created_at), new Date())}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<MessagesSquare />} title={t("empty")} />
        )}
      </Card>
    </div>
  );
}
