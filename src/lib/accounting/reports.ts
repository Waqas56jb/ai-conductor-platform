import { cents, paidOf, parisDay } from "./ledger";

/** Figures of the reports page, computed from rows the user may read. */

type Invoice = {
  id: string;
  amount: number;
  issued_at: string;
  due_at: string | null;
  status: string;
};
type Payment = { invoice_id: string; amount: number; paid_at: string | null; status: string };
type Quote = { status: string; sent_at: string | null; client_declined_at: string | null };

const month = (iso: string) => Number(parisDay(iso).slice(5, 7)) - 1;
const inYear = (iso: string | null, year: number): iso is string =>
  iso !== null && parisDay(iso).startsWith(`${year}-`);

/** Per month: invoiced (TTC, by issue date) and collected (verified payments, by payment date). */
export function monthlyRevenue(
  year: number,
  invoices: readonly Invoice[],
  payments: readonly Payment[],
) {
  const months = Array.from({ length: 12 }, (_, m) => ({ month: m, invoiced: 0, collected: 0 }));
  for (const i of invoices)
    if (i.status !== "cancelled" && inYear(i.issued_at, year))
      months[month(i.issued_at)].invoiced += Number(i.amount);
  for (const p of payments)
    if (p.status === "verified" && inYear(p.paid_at, year))
      months[month(p.paid_at)].collected += Number(p.amount);
  return months.map((m) => ({ ...m, invoiced: cents(m.invoiced), collected: cents(m.collected) }));
}

export const AGEING_BUCKETS = ["notDue", "d30", "d60", "d90", "d90plus"] as const;
export type AgeingBucket = (typeof AGEING_BUCKETS)[number];

const bucketOf = (daysLate: number): AgeingBucket =>
  daysLate <= 0
    ? "notDue"
    : daysLate <= 30
      ? "d30"
      : daysLate <= 60
        ? "d60"
        : daysLate <= 90
          ? "d90"
          : "d90plus";

/** What clients still owe, by how late it is. */
export function receivablesAgeing(
  invoices: readonly Invoice[],
  payments: readonly Payment[],
  now: Date,
) {
  const out = new Map(AGEING_BUCKETS.map((b) => [b, { bucket: b, amount: 0, count: 0 }]));
  for (const i of invoices) {
    if (i.status === "paid" || i.status === "cancelled") continue;
    const due = cents(Number(i.amount) - paidOf(payments.filter((p) => p.invoice_id === i.id)));
    if (due <= 0) continue;
    const daysLate = i.due_at
      ? Math.floor((now.getTime() - new Date(i.due_at).getTime()) / 86_400_000)
      : 0;
    const row = out.get(bucketOf(daysLate))!;
    row.amount = cents(row.amount + due);
    row.count += 1;
  }
  return [...out.values()];
}

const ACCEPTED = ["accepted", "client_signed", "invoiced"];

/** Quotes the client saw this year: accepted, declined, still waiting; and the rate. */
export function quoteConversion(year: number, quotes: readonly Quote[]) {
  const months = Array.from({ length: 12 }, (_, m) => ({
    month: m,
    accepted: 0,
    declined: 0,
    pending: 0,
  }));
  for (const q of quotes) {
    if (!inYear(q.sent_at, year)) continue;
    const kind = ACCEPTED.includes(q.status)
      ? "accepted"
      : q.client_declined_at
        ? "declined"
        : q.status === "sent_to_client"
          ? "pending"
          : null;
    if (kind) months[month(q.sent_at)][kind] += 1;
  }
  const total = (k: "accepted" | "declined" | "pending") => months.reduce((s, m) => s + m[k], 0);
  const accepted = total("accepted");
  const declined = total("declined");
  const decided = accepted + declined;
  return {
    sent: decided + total("pending"),
    accepted,
    declined,
    pending: total("pending"),
    /** Among the quotes the client decided on; null before any decision. */
    rate: decided ? Math.round((accepted / decided) * 1000) / 10 : null,
    months,
  };
}
