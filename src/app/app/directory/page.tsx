import type { Metadata } from "next";
import { Mail, Phone, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "../team.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("directory"))("title") };
}

export default async function DirectoryPage() {
  await requireRole(["manager", "director", "admin", "accountant", "technician"]);
  const [t, tr] = await Promise.all([getTranslations("directory"), getTranslations("roles")]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_users")
    .select("id, display_name, email, phone, role")
    .neq("role", "client")
    .eq("active", true)
    .order("display_name");
  const team = data ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      {team.length ? (
        <ul className={styles.grid}>
          {team.map((p) => (
            <li key={p.id} className={styles.card}>
              <div className={styles.head}>
                <strong>{p.display_name || p.email}</strong>
                <Badge tone="violet">{tr(p.role)}</Badge>
              </div>
              <p className={styles.muted}>{p.email}</p>
              <div className={styles.links}>
                {p.phone ? (
                  <a
                    href={`tel:${p.phone.replace(/\s/g, "")}`}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    <Phone aria-hidden="true" />
                    {t("call")}
                  </a>
                ) : null}
                <a
                  href={`mailto:${p.email}`}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  <Mail aria-hidden="true" />
                  {t("email")}
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState icon={<Users />} title={t("title")} />
        </Card>
      )}
    </div>
  );
}
