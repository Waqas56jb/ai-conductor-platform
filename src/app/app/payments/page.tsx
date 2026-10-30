import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Download, FileSearch, Landmark, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { Badge, Card, EmptyState, KpiTile, Table, buttonClass, type Column } from "@/components/ui";
import { PAYMENT_ROLES, REPORT_ROLES } from "@/lib/accounting/access";
import { cents, parisDay } from "@/lib/accounting/ledger";
import { requireRole } from "@/lib/auth/session";
import type { PaymentRow } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/cases/cases.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("payments"))("title") };
}

type Row = PaymentRow & { invoice: { reference: string; title: string; client: string } | null };

/** Every payment received, newest first, with the year's totals. */
export default async function PaymentsPage() {
  const profile = await requireRole(PAYMENT_ROLES);
  const [t, tm, format] = await Promise.all([
    getTranslations("payments"),
    getTranslations("invoices.payment.methods"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const [{ data: payments }, { data: invoices }, { data: clients }] = await Promise.all([
    supabase
      .from("ai_conductor_payments")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(500),
    supabase.from("ai_conductor_invoices").select("id, reference, title, client_id, status"),
    supabase.from("ai_conductor_users").select("id, display_name, email").eq("role", "client"),
  ]);
  const names = new Map((clients ?? []).map((c) => [c.id, c.display_name || c.email]));
  const invoiceOf = new Map((invoices ?? []).map((i) => [i.id, i]));
  const rows: Row[] = (payments ?? []).map((p) => {
    const inv = invoiceOf.get(p.invoice_id);
    return {
      ...p,
      invoice: inv
        ? {
            reference: inv.reference,
            title: inv.title,
            client: (inv.client_id && names.get(inv.client_id)) || "—",
          }
        : null,
    };
  });

  const today = parisDay(new Date());
  const verified = rows.filter((p) => p.status === "verified" && p.paid_at);
  const total = (list: Row[]) => cents(list.reduce((s, p) => s + Number(p.amount), 0));
  const thisMonth = verified.filter((p) => parisDay(p.paid_at!).slice(0, 7) === today.slice(0, 7));
  const thisYear = verified.filter((p) => parisDay(p.paid_at!).slice(0, 4) === today.slice(0, 4));
  const toReview = (invoices ?? []).filter((i) => i.status === "under_review").length;
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const canExport = REPORT_ROLES.includes(profile.role);

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: t("columns.date"),
      render: (p) =>
        p.paid_at ? format.dateTime(new Date(p.paid_at), { dateStyle: "short" }) : "—",
    },
    {
      key: "invoice",
      header: t("columns.invoice"),
      render: (p) =>
        p.invoice ? (
          <span>
            <strong>{p.invoice.reference}</strong>
            <br />
            <span className={styles.muted}>{p.invoice.client}</span>
          </span>
        ) : (
          "—"
        ),
    },
    { key: "method", header: t("columns.method"), render: (p) => tm(p.method) },
    { key: "reference", header: t("columns.reference"), render: (p) => p.reference || "—" },
    {
      key: "source",
      header: t("columns.source"),
      render: (p) => (
        <Badge tone={p.source === "receipt" ? "info" : "neutral"}>{t(`sources.${p.source}`)}</Badge>
      ),
    },
    {
      key: "amount",
      header: t("columns.amount"),
      align: "end",
      render: (p) => <strong>{eur(Number(p.amount))}</strong>,
    },
  ];

  return (
    <div className="stack">
      <LiveRefresh channel="payments" tables={[{ table: "ai_conductor_payments" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        {canExport ? (
          <a
            className={buttonClass({ variant: "secondary" })}
            href={`/api/exports/payments?year=${today.slice(0, 4)}`}
            download
          >
            <Download aria-hidden="true" />
            {t("export")}
          </a>
        ) : null}
      </div>
      <div className="grid-kpi">
        <KpiTile icon={<CalendarCheck />} label={t("kpi.month")} value={eur(total(thisMonth))} />
        <KpiTile
          icon={<Wallet />}
          tone="green"
          label={t("kpi.year")}
          value={eur(total(thisYear))}
        />
        <KpiTile icon={<Landmark />} tone="violet" label={t("kpi.count")} value={thisYear.length} />
        <KpiTile icon={<FileSearch />} tone="cyan" label={t("kpi.review")} value={toReview} />
      </div>
      {toReview ? (
        <p>
          <Link className={styles.caseLink} href="/app/invoices">
            <strong>{t("reviewLink", { count: toReview })}</strong>
          </Link>
        </p>
      ) : null}
      <Card flush>
        <Table
          caption={t("title")}
          columns={columns}
          rows={rows}
          getRowKey={(p) => p.id}
          empty={<EmptyState icon={<Wallet />} title={t("empty")} />}
        />
      </Card>
    </div>
  );
}
