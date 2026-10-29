import type { Metadata } from "next";
import { Bell, Inbox, LayoutTemplate, Scale, Users } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, EmptyState, KpiTile } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("dashboard") };
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [t, tTemplates, format] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("templates"),
    getFormatter(),
  ]);
  const supabase = await createClient();

  const [{ data: company }, { count: teamCount }, { count: unreadCount }, { data: settings }] =
    await Promise.all([
      supabase
        .from("ai_conductor_companies")
        .select("name, template_key")
        .eq("id", profile.company_id)
        .single(),
      supabase
        .from("ai_conductor_users")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("ai_conductor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("read", false),
      supabase.from("ai_conductor_settings").select("approval_threshold_eur").maybeSingle(),
    ]);

  const firstName = (profile.display_name || profile.email).split(" ")[0];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("welcome", { name: firstName })}</h1>
          <p>{t("sub", { company: company?.name ?? "" })}</p>
        </div>
      </div>

      <div className="grid-kpi">
        <KpiTile
          icon={<Users />}
          label={t("kpi.team")}
          value={teamCount ?? 0}
          hint={t("kpi.teamHint")}
        />
        <KpiTile
          icon={<Bell />}
          tone="cyan"
          label={t("kpi.unread")}
          value={unreadCount ?? 0}
          hint={t("kpi.unreadHint")}
        />
        <KpiTile
          icon={<Scale />}
          tone="violet"
          label={t("kpi.threshold")}
          value={
            settings
              ? format.number(Number(settings.approval_threshold_eur), {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                })
              : "—"
          }
          hint={t("kpi.thresholdHint")}
        />
        <KpiTile
          icon={<LayoutTemplate />}
          tone="green"
          label={t("kpi.template")}
          value={company ? tTemplates(company.template_key) : "—"}
          hint={t("kpi.templateHint")}
        />
      </div>

      <Card title={t("activityTitle")}>
        <EmptyState icon={<Inbox />} title={t("activityEmpty")} text={t("activityEmptyText")} />
      </Card>
    </div>
  );
}
