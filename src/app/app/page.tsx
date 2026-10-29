import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  FileText,
  FolderOpen,
  HardHat,
  Receipt,
  UserPlus,
  Wallet,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CaseTable } from "@/components/cases/CaseTable";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { Card, EmptyState, KpiTile, buttonClass } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { listCases } from "@/lib/cases/queries";
import { createClient } from "@/lib/supabase/server";
import { FINAL_STATUSES, INCIDENT_STATUSES } from "@/lib/workflows/incident";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("dashboard") };
}

const OPEN = INCIDENT_STATUSES.filter((s) => !FINAL_STATUSES.includes(s));

type Kpi = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "blue" | "cyan" | "violet" | "green";
};

/** Figures come from RLS-scoped queries: each role counts only what it can see. */
export default async function DashboardPage() {
  const profile = await requireProfile();
  const [t, td, ti, tn, format] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("dashboardRole"),
    getTranslations("invoices"),
    getTranslations("nav"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const [{ data: company }, cases, { data: invoices }, { data: interventions }] = await Promise.all(
    [
      supabase.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
      listCases(),
      supabase.from("ai_conductor_invoices").select("amount, status, due_at"),
      supabase
        .from("ai_conductor_interventions")
        .select("id")
        .eq("status", "planned")
        .gte("scheduled_at", new Date().toISOString()),
    ],
  );

  const count = (statuses: readonly string[]) =>
    cases.filter((c) => statuses.includes(c.status)).length;
  const unpaid = (invoices ?? []).filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const eur = (n: number) =>
    format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const upcoming = interventions?.length ?? 0;

  let kpis: Kpi[];
  switch (profile.role) {
    case "client":
      kpis = [
        { label: td("myOpen"), value: count(OPEN), icon: <FolderOpen /> },
        {
          label: td("quotesWaiting"),
          value: count(["sent_to_client"]),
          icon: <FileText />,
          tone: "violet",
        },
        { label: td("unpaidInvoices"), value: unpaid.length, icon: <Receipt />, tone: "cyan" },
      ];
      break;
    case "technician":
      kpis = [
        { label: td("myTasks"), value: count(OPEN), icon: <HardHat /> },
        {
          label: td("siteVisits"),
          value: count(["site_visit"]),
          icon: <ClipboardCheck />,
          tone: "cyan",
        },
        { label: td("today"), value: upcoming, icon: <CalendarClock />, tone: "violet" },
      ];
      break;
    case "accountant":
      kpis = [
        {
          label: td("receivables"),
          value: eur(unpaid.reduce((s, i) => s + Number(i.amount), 0)),
          icon: <Wallet />,
        },
        {
          label: ti("kpi.review"),
          value: (invoices ?? []).filter((i) => i.status === "under_review").length,
          icon: <FileSearch />,
          tone: "cyan",
        },
        {
          label: ti("kpi.overdue"),
          value: unpaid.filter((i) => i.due_at && new Date(i.due_at).getTime() < Date.now()).length,
          icon: <AlarmClock />,
          tone: "violet",
        },
      ];
      break;
    default: {
      const approve =
        profile.role === "manager"
          ? ["devis_pending_manager"]
          : profile.role === "director"
            ? ["devis_pending_director"]
            : ["devis_pending_manager", "devis_pending_director"];
      kpis = [
        { label: td("openCases"), value: count(OPEN), icon: <FolderOpen /> },
        {
          label: td("toAssign"),
          value: count(["new", "awaiting_assignment"]),
          icon: <UserPlus />,
          tone: "cyan",
        },
        { label: td("toApprove"), value: count(approve), icon: <ClipboardCheck />, tone: "violet" },
        { label: td("planned"), value: upcoming, icon: <CalendarClock />, tone: "green" },
      ];
    }
  }

  const firstName = (profile.display_name || profile.email).split(" ")[0];

  return (
    <div className="stack">
      <LiveRefresh
        channel="dashboard"
        tables={[{ table: "ai_conductor_incidents" }, { table: "ai_conductor_invoices" }]}
      />
      <div className="page-header">
        <div>
          <h1>{t("welcome", { name: firstName })}</h1>
          <p>{t("sub", { company: company?.name ?? "" })}</p>
        </div>
        {profile.role === "client" ? (
          <Link href="/app/cases/new" className={buttonClass()}>
            {tn("report")}
          </Link>
        ) : null}
      </div>

      <div className="grid-kpi">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} icon={k.icon} tone={k.tone} />
        ))}
      </div>

      <Card
        title={td("recent")}
        flush
        actions={
          cases.length ? (
            <Link href="/app/cases" className={buttonClass({ variant: "ghost", size: "sm" })}>
              {td("viewAll")}
            </Link>
          ) : null
        }
      >
        <CaseTable
          cases={cases.slice(0, 6)}
          caption={td("recent")}
          empty={
            <EmptyState
              icon={<FolderOpen />}
              title={t("activityEmpty")}
              text={t("activityEmptyText")}
            />
          }
        />
      </Card>
    </div>
  );
}
