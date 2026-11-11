import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Eye, MousePointerClick, Send } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState, KpiTile, Table, type Column } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import type { DemoRequestRow } from "@/lib/db/types";
import { bySource, funnel, isPlatformAdmin } from "@/lib/demo/funnel";
import { slotLabel } from "@/lib/demo/slots";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "@/components/cases/cases.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("demos"))("title") };
}

const DAYS = 30;
const TONE = { requested: "warning", confirmed: "success", cancelled: "neutral" } as const;

/**
 * Pratonna team only: free demo requests from the marketing site and the
 * anonymous funnel (visits → demo clicks → requests → confirmed meetings).
 */
export default async function DemosPage() {
  const profile = await requireProfile();
  if (!isPlatformAdmin(profile.email, env.PLATFORM_ADMIN_EMAILS)) notFound();
  const [t, format] = await Promise.all([getTranslations("demos"), getFormatter()]);

  const db = createAdminClient();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const [{ data: events }, { data: requests }] = await Promise.all([
    db.from("ai_conductor_site_events").select("name, source").gte("created_at", since).limit(50000),
    db
      .from("ai_conductor_demo_requests")
      .select("*")
      .gte("slot_start", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("slot_start")
      .limit(200),
  ]);
  const total = funnel(events ?? []);
  const sources = bySource(events ?? []);
  const pct = (n: number | null) => (n === null ? "—" : format.number(n, { style: "percent" }));

  const columns: Column<DemoRequestRow>[] = [
    { key: "slot", header: t("columns.slot"), render: (r) => slotLabel(r.slot_start, "fr") },
    {
      key: "who",
      header: t("columns.who"),
      render: (r) => (
        <span>
          <strong>{r.name}</strong>
          <br />
          <span className={styles.muted}>{[r.company, r.email].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { key: "sector", header: t("columns.sector"), render: (r) => r.sector || "—" },
    { key: "source", header: t("columns.source"), render: (r) => r.source || t("direct") },
    {
      key: "status",
      header: t("columns.status"),
      render: (r) => <Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>,
    },
    {
      key: "open",
      header: t("columns.open"),
      align: "end",
      render: (r) => (
        <Link className={styles.caseLink} href={`/demo/${r.token}`}>
          {t("manage")}
        </Link>
      ),
    },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub", { days: DAYS })}</p>
        </div>
      </div>
      <div className="grid-kpi">
        <KpiTile icon={<Eye />} label={t("kpi.visits")} value={total.visits} />
        <KpiTile icon={<MousePointerClick />} tone="cyan" label={t("kpi.clicks")} value={total.clicks} />
        <KpiTile
          icon={<Send />}
          tone="violet"
          label={t("kpi.submitted")}
          value={total.submitted}
          hint={t("kpi.rate", { rate: pct(total.clickToRequest) })}
        />
        <KpiTile icon={<CalendarCheck />} tone="green" label={t("kpi.confirmed")} value={total.confirmed} />
      </div>
      <Card flush>
        <Table
          caption={t("requests")}
          columns={columns}
          rows={requests ?? []}
          getRowKey={(r) => r.id}
          empty={<EmptyState title={t("empty")} />}
        />
      </Card>
      <Card>
        <h2>{t("sources")}</h2>
        <Table
          caption={t("sources")}
          columns={[
            { key: "source", header: t("columns.source"), render: (s) => (s.source === "direct" ? t("direct") : s.source) },
            { key: "visits", header: t("kpi.visits"), align: "end", render: (s) => s.visits },
            { key: "clicks", header: t("kpi.clicks"), align: "end", render: (s) => s.clicks },
            { key: "submitted", header: t("kpi.submitted"), align: "end", render: (s) => s.submitted },
            { key: "confirmed", header: t("kpi.confirmed"), align: "end", render: (s) => s.confirmed },
          ]}
          rows={sources}
          getRowKey={(s) => s.source}
          empty={<EmptyState title={t("noTraffic")} />}
        />
        <p className={styles.muted}>{t("privacy")}</p>
      </Card>
    </div>
  );
}
