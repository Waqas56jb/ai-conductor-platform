import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { SupportForm } from "@/components/account/SupportForm";
import styles from "@/app/app/team.module.css";
import { Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("support"))("title") };
}

export default async function SupportPage() {
  const profile = await requireRole(["client"]);
  const [t, format] = await Promise.all([getTranslations("support"), getFormatter()]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_feedback")
    .select("id, topic, rating, message, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  const history = data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <Card>
        <SupportForm />
      </Card>
      <Card title={t("history")} flush>
        {history.length ? (
          <ul className={styles.list}>
            {history.map((f) => (
              <li key={f.id} className={styles.item}>
                <strong>
                  {t(`topics.${f.topic ?? "service"}`)} · {"★".repeat(f.rating ?? 0)}
                </strong>
                <span>{f.message}</span>
                <span className={styles.muted}>
                  {format.dateTime(new Date(f.created_at), { dateStyle: "medium" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("empty")} />
        )}
      </Card>
    </div>
  );
}
