import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CircleCheck, FileSearch, Receipt, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { InvoiceCard } from "@/components/cases/CaseSummaryCards";
import { InvoiceActions } from "@/components/cases/InvoiceActions";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import styles from "@/components/cases/cases.module.css";
import { Badge, Card, EmptyState, KpiTile, Table, type Column } from "@/components/ui";
import { cents, paidOf } from "@/lib/accounting/ledger";
import { requireRole } from "@/lib/auth/session";
import type { InvoiceRow } from "@/lib/db/types";
import { RECEIPT_BUCKET, signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("invoices"))("title") };
}

const TONE = {
  unpaid: "warning",
  under_review: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
} as const;

export default async function InvoicesPage() {
  const profile = await requireRole(["client", "manager", "director", "admin", "accountant"]);
  const [t, ti, format] = await Promise.all([
    getTranslations("invoices"),
    getTranslations("cases.invoice"),
    getFormatter(),
  ]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_invoices")
    .select("*")
    .order("issued_at", { ascending: false })
    .limit(300);
  const invoices: InvoiceRow[] = data ?? [];
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const isClient = profile.role === "client";
  const now = Date.now();
  const overdue = (i: InvoiceRow) =>
    i.status !== "paid" && i.due_at !== null && new Date(i.due_at).getTime() < now;

  if (isClient) {
    const receipts = await signedUrls(
      RECEIPT_BUCKET,
      invoices.flatMap((i) => (i.receipt_url ? [i.receipt_url] : [])),
    );
    return (
      <div className="stack">
        <LiveRefresh channel="invoices" tables={[{ table: "ai_conductor_invoices" }]} />
        <div className="page-header">
          <div>
            <h1>{t("titleClient")}</h1>
            <p>{t("subClient")}</p>
          </div>
        </div>
        {invoices.length ? (
          invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              receiptUrl={invoice.receipt_url ? (receipts[invoice.receipt_url] ?? null) : null}
              canUpload
              canManage={false}
            />
          ))
        ) : (
          <Card>
            <EmptyState icon={<Receipt />} title={t("empty")} />
          </Card>
        )}
      </div>
    );
  }

  const { data: paymentRows } = await supabase
    .from("ai_conductor_payments")
    .select("invoice_id, amount, status")
    .in(
      "invoice_id",
      invoices.map((i) => i.id),
    );
  const paidBy = new Map<string, number>();
  for (const id of new Set((paymentRows ?? []).map((p) => p.invoice_id)))
    paidBy.set(id, paidOf((paymentRows ?? []).filter((p) => p.invoice_id === id)));
  const remaining = (i: InvoiceRow) =>
    i.status === "paid" || i.status === "cancelled"
      ? 0
      : Math.max(0, cents(Number(i.amount) - (paidBy.get(i.id) ?? 0)));
  const reviewing = invoices.filter((i) => i.status === "under_review" && i.receipt_url);
  const receiptLinks = await signedUrls(
    RECEIPT_BUCKET,
    reviewing.map((i) => i.receipt_url as string),
  );

  const open = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const columns: Column<InvoiceRow>[] = [
    {
      key: "reference",
      header: t("columns.reference"),
      render: (i) =>
        i.incident_id ? (
          <Link href={`/app/cases/${i.incident_id}`} className={styles.caseLink}>
            <strong>{i.reference}</strong>
          </Link>
        ) : (
          i.reference
        ),
    },
    { key: "title", header: t("columns.title"), render: (i) => i.title },
    {
      key: "amount",
      header: t("columns.amount"),
      align: "end",
      render: (i) => eur(Number(i.amount)),
    },
    {
      key: "remaining",
      header: t("columns.remaining"),
      align: "end",
      render: (i) => <span data-testid={`remaining-${i.reference}`}>{eur(remaining(i))}</span>,
    },
    {
      key: "due",
      header: t("columns.due"),
      render: (i) => (i.due_at ? format.dateTime(new Date(i.due_at), { dateStyle: "short" }) : "—"),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (i) => {
        const late = overdue(i);
        return (
          <Badge tone={late ? "danger" : TONE[i.status]}>
            {ti(`statuses.${late ? "overdue" : i.status}`)}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: t("columns.actions"),
      render: (i) =>
        i.status === "paid" || i.status === "cancelled" ? (
          <span className={styles.muted}>{ti("reminders", { count: i.reminders.length })}</span>
        ) : (
          <div className="stack" style={{ gap: "0.5rem" }}>
            {i.status === "under_review" && i.receipt_url && receiptLinks[i.receipt_url] ? (
              <a
                className={styles.caseLink}
                href={receiptLinks[i.receipt_url]}
                target="_blank"
                rel="noreferrer"
              >
                <strong>{ti("viewReceipt")}</strong>
              </a>
            ) : null}
            <InvoiceActions
              invoiceId={i.id}
              canUpload={false}
              canManage
              remaining={remaining(i)}
              underReview={i.status === "under_review"}
            />
          </div>
        ),
    },
  ];

  return (
    <div className="stack">
      <LiveRefresh channel="invoices" tables={[{ table: "ai_conductor_invoices" }]} />
      <div className="page-header">
        <div>
          <h1>
            {profile.role === "director" || profile.role === "accountant"
              ? t("titleFinance")
              : t("title")}
          </h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <div className="grid-kpi">
        <KpiTile
          icon={<Wallet />}
          label={t("kpi.unpaid")}
          value={eur(open.reduce((s, i) => s + remaining(i), 0))}
        />
        <KpiTile
          icon={<FileSearch />}
          tone="cyan"
          label={t("kpi.review")}
          value={invoices.filter((i) => i.status === "under_review").length}
        />
        <KpiTile
          icon={<AlarmClock />}
          tone="violet"
          label={t("kpi.overdue")}
          value={invoices.filter(overdue).length}
        />
        <KpiTile
          icon={<CircleCheck />}
          tone="green"
          label={t("kpi.paid")}
          value={eur(paidOf(paymentRows ?? []))}
        />
      </div>
      <Card flush>
        <Table
          caption={t("title")}
          columns={columns}
          rows={invoices}
          getRowKey={(i) => i.id}
          empty={<EmptyState icon={<Receipt />} title={t("empty")} />}
        />
      </Card>
    </div>
  );
}
