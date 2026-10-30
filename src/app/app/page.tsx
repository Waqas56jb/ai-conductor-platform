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
import { RecommendationsCard } from "@/components/assistant/RecommendationsCard";
import { WelcomeCard, type Priority } from "@/components/assistant/WelcomeCard";
import { CaseTable } from "@/components/cases/CaseTable";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { Card, EmptyState, KpiTile, buttonClass } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { listCases } from "@/lib/cases/queries";
import { recommend } from "@/lib/recommendations";
import { createClient } from "@/lib/supabase/server";
import { waitingFor } from "@/lib/workflows/approval-chain";
import { FINAL_STATUSES, INCIDENT_STATUSES } from "@/lib/workflows/incident";
import { SERVICE_ORDER_CHAIN } from "@/lib/workflows/service-order";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("dashboard") };
}

const OPEN = INCIDENT_STATUSES.filter((s) => !FINAL_STATUSES.includes(s));
/** A case message older than this no longer counts as waiting for an answer. */
const UNANSWERED_DAYS = 14;

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
  const now = new Date();
  const [
    { data: company },
    cases,
    { data: invoices },
    { data: interventions },
    { count: pendingProposals },
    { data: messages },
    { data: quotes },
    { data: tasks },
    { count: ordersToDecide },
  ] = await Promise.all([
    supabase.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
    listCases(),
    supabase.from("ai_conductor_invoices").select("amount, status, due_at, reference, reminders"),
    supabase
      .from("ai_conductor_interventions")
      .select("id")
      .eq("status", "planned")
      .gte("scheduled_at", now.toISOString()),
    // The user's own assistant proposals still waiting for a decision.
    supabase
      .from("ai_conductor_ai_actions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("expires_at", now.toISOString()),
    // Recent case messages the user can see, newest first.
    supabase
      .from("ai_conductor_incident_messages")
      .select("incident_id, from_id")
      .gte("created_at", new Date(now.getTime() - UNANSWERED_DAYS * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("ai_conductor_quotations")
      .select("reference, status, updated_at")
      .eq("status", "sent_to_client"),
    profile.role === "client"
      ? Promise.resolve({ data: [] })
      : supabase
          .from("ai_conductor_team_tasks")
          .select("title, status, due_at, assignee_id")
          .eq("assignee_id", profile.id)
          .neq("status", "done"),
    // Service orders at a step this role decides (RLS: office and accounting only).
    waitingFor(SERVICE_ORDER_CHAIN, profile.role).length
      ? supabase
          .from("ai_conductor_service_orders")
          .select("id", { count: "exact", head: true })
          .in("status", waitingFor(SERVICE_ORDER_CHAIN, profile.role))
      : Promise.resolve({ count: 0 }),
  ]);

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
          value: unpaid.filter((i) => i.due_at && new Date(i.due_at) < now).length,
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

  // Today's priorities: overdue invoices, what waits for this user's decision,
  // and cases whose latest message is from someone else.
  const overdue = unpaid.filter((i) => i.due_at && new Date(i.due_at) < now).length;
  const toDecide: Record<typeof profile.role, number> = {
    client: count(["sent_to_client"]),
    technician: count(["site_visit"]),
    manager: count(["devis_pending_manager"]),
    director: count(["devis_pending_director"]),
    admin: count(["devis_pending_manager", "devis_pending_director"]),
    accountant: (invoices ?? []).filter((i) => i.status === "under_review").length,
  };
  const latest = new Map<string, string | null>();
  for (const m of messages ?? [])
    if (!latest.has(m.incident_id)) latest.set(m.incident_id, m.from_id);
  const unanswered = [...latest.values()].filter((from) => from !== profile.id).length;
  const recommendations = recommend({
    now,
    role: profile.role,
    meId: profile.id,
    quotes: quotes ?? [],
    invoices: invoices ?? [],
    cases,
    tasks: tasks ?? [],
  });
  const priorities: Priority[] = [
    { key: "overdue", count: overdue },
    {
      key: "approvals",
      count: toDecide[profile.role] + (pendingProposals ?? 0) + (ordersToDecide ?? 0),
    },
    { key: "messages", count: unanswered },
  ];

  return (
    <div className="stack">
      <LiveRefresh
        channel="dashboard"
        tables={[
          { table: "ai_conductor_incidents" },
          { table: "ai_conductor_invoices" },
          { table: "ai_conductor_incident_messages" },
        ]}
      />
      <WelcomeCard
        firstName={firstName}
        company={company?.name ?? ""}
        priorities={priorities}
        action={
          profile.role === "client" ? (
            <Link href="/app/cases/new" className={buttonClass()}>
              {tn("report")}
            </Link>
          ) : undefined
        }
      />

      <RecommendationsCard items={recommendations} />

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
