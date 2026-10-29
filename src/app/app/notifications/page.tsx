import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { PushToggle } from "@/components/notifications/PushToggle";
import { SmartInbox, type InboxItem } from "@/components/notifications/SmartInbox";
import { MarkAllReadButton } from "@/components/shell/MarkAllReadButton";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/notifications/SmartInbox.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("notificationsPage"))("title") };
}

/** Smart inbox: urgent / important / digest, with rules the user approved. */
export default async function NotificationsPage() {
  const profile = await requireProfile();
  const [t, ts] = await Promise.all([
    getTranslations("notificationsPage"),
    getTranslations("shell"),
  ]);
  const supabase = await createClient();
  const [{ data }, { data: rules }] = await Promise.all([
    supabase
      .from("ai_conductor_notifications")
      .select("id, type, title, body, read, incident_id, created_at, priority, source")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("ai_conductor_priority_rules")
      .select("id, label, approved")
      .order("created_at", { ascending: false }),
  ]);
  const items: InboxItem[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type ?? "",
    title: n.title,
    body: n.body,
    read: n.read,
    href: n.incident_id ? `/app/cases/${n.incident_id}` : null,
    createdAt: n.created_at,
    priority: n.priority,
    source: n.source,
  }));

  return (
    <div className="stack">
      <LiveRefresh
        channel="inbox"
        tables={[{ table: "ai_conductor_notifications", filter: `user_id=eq.${profile.id}` }]}
      />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        <div className={styles.headerActions}>
          <PushToggle />
          {items.some((n) => !n.read) ? <MarkAllReadButton label={ts("markAllRead")} /> : null}
        </div>
      </div>
      <Card>
        <SmartInbox items={items} rules={rules ?? []} now={new Date().toISOString()} />
      </Card>
    </div>
  );
}
