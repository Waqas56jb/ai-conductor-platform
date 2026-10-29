import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import type { InterventionRow, InvoiceRow, QuotationRow } from "@/lib/db/types";
import { INCIDENT_STATUSES, type IncidentStatus } from "@/lib/workflows/incident";
import { InvoiceActions } from "./InvoiceActions";
import styles from "./cases.module.css";

const eurOpts = { style: "currency", currency: "EUR" } as const;

export async function QuoteCard({
  quote,
  showDiagnosis,
}: {
  quote: QuotationRow;
  showDiagnosis: boolean;
}) {
  const [t, ta, format] = await Promise.all([
    getTranslations("cases.quote"),
    getTranslations("cases.actions"),
    getFormatter(),
  ]);
  const pending = quote.status === "pending_manager" || quote.status === "pending_director";
  return (
    <Card
      title={t("title", { reference: quote.reference })}
      description={quote.title}
      actions={
        pending ? (
          <Badge tone="violet">{t("pending")}</Badge>
        ) : quote.signed_at ? (
          <Badge tone="success">
            {t("signedOn", {
              date: format.dateTime(new Date(quote.signed_at), { dateStyle: "medium" }),
            })}
          </Badge>
        ) : null
      }
    >
      <div className={styles.stack}>
        {quote.summary ? <p>{quote.summary}</p> : null}
        {showDiagnosis && quote.diagnosis ? (
          <p className={styles.muted}>{quote.diagnosis}</p>
        ) : null}
        <div style={{ overflowX: "auto" }}>
          <table className={styles.lines}>
            <thead>
              <tr>
                <th>{ta("lineLabel")}</th>
                <th className={styles.num}>{ta("quantity")}</th>
                <th className={styles.num}>{ta("unitPrice")}</th>
                <th className={styles.num}>{ta("lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {quote.line_items.map((l, i) => (
                <tr key={i}>
                  <td>{l.label}</td>
                  <td className={styles.num}>{format.number(l.quantity)}</td>
                  <td className={styles.num}>{format.number(l.unit_price_ht, eurOpts)}</td>
                  <td className={styles.num}>
                    {format.number(Math.round(l.quantity * l.unit_price_ht * 100) / 100, eurOpts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.totals}>
          <div>
            <span>{ta("subtotal")}</span>
            <span>{format.number(Number(quote.subtotal_ht), eurOpts)}</span>
          </div>
          <div>
            <span>
              {ta("tax")} {String(quote.tax_rate).replace(".", ",")} %
            </span>
            <span>{format.number(Number(quote.tax_amount), eurOpts)}</span>
          </div>
          <div className={styles.grand}>
            <span>{ta("total")}</span>
            <span data-testid="quote-total">{format.number(Number(quote.total_ttc), eurOpts)}</span>
          </div>
        </div>
        <p className={styles.muted}>{t("validity", { days: quote.validity_days })}</p>
      </div>
    </Card>
  );
}

export async function InterventionCard({ intervention }: { intervention: InterventionRow }) {
  const [t, format] = await Promise.all([getTranslations("cases.intervention"), getFormatter()]);
  return (
    <Card
      title={t("title")}
      actions={<Badge tone="info">{t(`statuses.${intervention.status}`)}</Badge>}
    >
      <div className={styles.stack}>
        {intervention.scheduled_at ? (
          <p>
            {t("planned", {
              date: format.dateTime(new Date(intervention.scheduled_at), {
                dateStyle: "full",
                timeStyle: "short",
              }),
            })}
          </p>
        ) : null}
        {intervention.notes ? <p className={styles.muted}>{intervention.notes}</p> : null}
      </div>
    </Card>
  );
}

const INVOICE_TONE = {
  unpaid: "warning",
  under_review: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
} as const;

export async function InvoiceCard({
  invoice,
  receiptUrl,
  canUpload,
  canManage,
}: {
  invoice: InvoiceRow;
  receiptUrl: string | null;
  canUpload: boolean;
  canManage: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations("cases.invoice"), getFormatter()]);
  const paid = invoice.status === "paid";
  return (
    <Card
      title={t("title", { reference: invoice.reference })}
      description={invoice.title}
      actions={<Badge tone={INVOICE_TONE[invoice.status]}>{t(`statuses.${invoice.status}`)}</Badge>}
    >
      <div className={styles.stack}>
        <p className={styles.grand} style={{ fontSize: "1.4rem" }}>
          {format.number(Number(invoice.amount), eurOpts)}
        </p>
        <p className={styles.muted}>
          {paid && invoice.paid_at
            ? t("paidOn", {
                date: format.dateTime(new Date(invoice.paid_at), { dateStyle: "medium" }),
              })
            : invoice.due_at
              ? t("due", {
                  date: format.dateTime(new Date(invoice.due_at), { dateStyle: "medium" }),
                })
              : null}
          {" · "}
          {t("reminders", { count: invoice.reminders.length })}
        </p>
        {receiptUrl ? (
          <a className={styles.caseLink} href={receiptUrl} target="_blank" rel="noreferrer">
            <strong>{t("viewReceipt")}</strong>
          </a>
        ) : null}
        {!paid ? (
          <InvoiceActions invoiceId={invoice.id} canUpload={canUpload} canManage={canManage} />
        ) : null}
      </div>
    </Card>
  );
}

/** Progress through the lifecycle (cancelled cases show where they stopped). */
export async function CaseTimeline({ status }: { status: IncidentStatus }) {
  const t = await getTranslations("status");
  const flow = INCIDENT_STATUSES.filter((s) => s !== "cancelled" && s !== "devis_pending_director");
  const effective = status === "devis_pending_director" ? "devis_pending_manager" : status;
  const index = flow.indexOf(effective as (typeof flow)[number]);
  return (
    <ol className={styles.timeline}>
      {flow.map((s, i) => (
        <li
          key={s}
          className={i < index ? styles.done : i === index ? styles.current : undefined}
          aria-current={i === index ? "step" : undefined}
        >
          {s === "devis_pending_manager" && status === "devis_pending_director"
            ? t("devis_pending_director")
            : t(s)}
        </li>
      ))}
      {status === "cancelled" ? <li className={styles.current}>{t("cancelled")}</li> : null}
    </ol>
  );
}
