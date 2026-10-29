import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { MarkAllReadButton } from "@/components/shell/MarkAllReadButton";
import { Card, EmptyState } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "../team.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("notificationsPage"))("title") };
}

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const [t, ts, format] = await Promise.all([
    getTranslations("notificationsPage"),
    getTranslations("shell"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_notifications")
    .select("id, title, body, read, incident_id, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = data ?? [];
  const now = new Date();

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        {items.some((n) => !n.read) ? <MarkAllReadButton label={ts("markAllRead")} /> : null}
      </div>
      <Card flush>
        {items.length ? (
          <ul className={styles.list}>
            {items.map((n) => (
              <li key={n.id} className={`${styles.item} ${n.read ? "" : styles.unread}`}>
                <strong>{n.title}</strong>
                {n.body ? <span>{n.body}</span> : null}
                <span className={styles.muted}>
                  {format.relativeTime(new Date(n.created_at), now)}
                </span>
                {n.incident_id ? (
                  <Link href={`/app/cases/${n.incident_id}`}>{t("open")}</Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<BellOff />} title={ts("noNotifications")} />
        )}
      </Card>
    </div>
  );
}
