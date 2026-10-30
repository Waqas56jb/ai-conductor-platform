import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Download, Percent, Receipt, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { Card, KpiTile, buttonClass } from "@/components/ui";
import { cents, parisDay } from "@/lib/accounting/ledger";
import { monthlyRevenue, quoteConversion, receivablesAgeing } from "@/lib/accounting/reports";
import { REPORT_ROLES } from "@/lib/accounting/access";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "./reports.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("reports"))("title") };
}

/** Revenue, receivables ageing, quote conversion; FEC and CSV exports. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireRole(REPORT_ROLES);
  const [t, format] = await Promise.all([getTranslations("reports"), getFormatter()]);
  const current = Number(parisDay(new Date()).slice(0, 4));
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked >= 2000 && asked <= current ? asked : current;

  // RLS: the company's rows only.
  const supabase = await createClient();
  const [{ data: invoices }, { data: payments }, { data: quotes }] = await Promise.all([
    supabase
      .from("ai_conductor_invoices")
      .select("id, amount, issued_at, due_at, status")
      .limit(5000),
    supabase
      .from("ai_conductor_payments")
      .select("invoice_id, amount, paid_at, status")
      .limit(10000),
    supabase
      .from("ai_conductor_quotations")
      .select("status, sent_at, client_declined_at")
      .not("sent_at", "is", null)
      .limit(5000),
  ]);
  const inv = invoices ?? [];
  const pay = payments ?? [];
  const revenue = monthlyRevenue(year, inv, pay);
  const ageing = receivablesAgeing(inv, pay, new Date());
  const conversion = quoteConversion(year, quotes ?? []);
  const firstYear = Math.min(current, ...inv.map((i) => Number(parisDay(i.issued_at).slice(0, 4))));
  const years = Array.from({ length: current - firstYear + 1 }, (_, i) => current - i);

  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const months = revenue.map((m) =>
    format.dateTime(new Date(Date.UTC(year, m.month, 15)), { month: "short" }),
  );
  const invoiced = cents(revenue.reduce((s, m) => s + m.invoiced, 0));
  const collected = cents(revenue.reduce((s, m) => s + m.collected, 0));
  const outstanding = cents(ageing.reduce((s, b) => s + b.amount, 0));

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>

      <nav className={styles.years} aria-label={t("year")}>
        {years.map((y) => (
          <Link
            key={y}
            href={y === current ? "/app/reports" : `/app/reports?year=${y}`}
            aria-current={y === year ? "page" : undefined}
          >
            {y}
          </Link>
        ))}
      </nav>

      <div className="grid-kpi">
        <KpiTile icon={<Receipt />} label={t("kpi.invoiced", { year })} value={eur(invoiced)} />
        <KpiTile
          icon={<CircleCheck />}
          tone="green"
          label={t("kpi.collected", { year })}
          value={eur(collected)}
        />
        <KpiTile
          icon={<Wallet />}
          tone="violet"
          label={t("kpi.outstanding")}
          value={eur(outstanding)}
        />
        <KpiTile
          icon={<Percent />}
          tone="cyan"
          label={t("kpi.conversion", { year })}
          value={conversion.rate === null ? "—" : `${format.number(conversion.rate)} %`}
        />
      </div>

      <Card title={t("revenue.title", { year })} description={t("revenue.sub")}>
        <ColumnChart
          title={t("revenue.title", { year })}
          categories={months}
          series={[
            { key: "invoiced", label: t("revenue.invoiced"), slot: 1 },
            { key: "collected", label: t("revenue.collected"), slot: 2 },
          ]}
          values={revenue.map((m) => [m.invoiced, m.collected])}
          unit="eur"
        />
      </Card>

      <div className={styles.pair}>
        <Card title={t("ageing.title")} description={t("ageing.sub")}>
          <BarList
            title={t("ageing.title")}
            rows={ageing.map((b) => ({
              key: b.bucket,
              label: t(`ageing.buckets.${b.bucket}`),
              detail: t("ageing.count", { count: b.count }),
              value: b.amount,
              display: eur(b.amount),
            }))}
          />
        </Card>

        <Card
          title={t("conversion.title", { year })}
          description={t("conversion.summary", {
            sent: conversion.sent,
            accepted: conversion.accepted,
            declined: conversion.declined,
            pending: conversion.pending,
          })}
        >
          {conversion.sent ? (
            <ColumnChart
              title={t("conversion.title", { year })}
              categories={months}
              series={[
                { key: "accepted", label: t("conversion.accepted"), slot: 2 },
                { key: "declined", label: t("conversion.declined"), slot: 3 },
                { key: "pending", label: t("conversion.pending"), slot: 1 },
              ]}
              values={conversion.months.map((m) => [m.accepted, m.declined, m.pending])}
              stacked
              unit="count"
            />
          ) : (
            <p className={styles.note}>{t("conversion.empty")}</p>
          )}
        </Card>
      </div>

      <Card title={t("exports.title")} description={t("exports.sub", { year })}>
        <div className={styles.exports}>
          <a
            className={buttonClass({ variant: "primary", size: "sm" })}
            href={`/api/exports/fec?year=${year}`}
            download
          >
            <Download aria-hidden="true" />
            {t("exports.fec")}
          </a>
          <a
            className={buttonClass({ variant: "secondary", size: "sm" })}
            href={`/api/exports/invoices?year=${year}`}
            download
          >
            <Download aria-hidden="true" />
            {t("exports.invoices")}
          </a>
          <a
            className={buttonClass({ variant: "secondary", size: "sm" })}
            href={`/api/exports/payments?year=${year}`}
            download
          >
            <Download aria-hidden="true" />
            {t("exports.payments")}
          </a>
        </div>
        <p className={styles.note}>{t("exports.fecNote")}</p>
      </Card>
    </div>
  );
}
