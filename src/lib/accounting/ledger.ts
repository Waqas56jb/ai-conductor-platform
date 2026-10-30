/** Money and dates shared by payments, reports and exports. */

export const cents = (n: number) => Math.round(n * 100) / 100;

/** Half a cent: below this, two amounts are the same. */
const EPSILON = 0.005;

type Payment = { amount: number; status: string };

/** What verified payments already cover. */
export const paidOf = (payments: readonly Payment[]) =>
  cents(payments.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0));

/**
 * A new payment against an invoice: refused if it is more than what remains;
 * the invoice is paid once nothing remains.
 */
export function settle(total: number, paidSoFar: number, amount: number) {
  const remaining = cents(total - paidSoFar);
  if (amount <= 0 || amount > remaining + EPSILON) return { ok: false as const, remaining };
  const left = cents(remaining - amount);
  return { ok: true as const, remaining: left, fullyPaid: left < EPSILON };
}

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" of an instant, in France (accounting dates are local dates). */
export const parisDay = (iso: string | Date) => PARIS_DAY.format(new Date(iso));
