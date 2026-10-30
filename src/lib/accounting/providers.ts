import "server-only";
import { env } from "@/lib/env";

/**
 * Accounting and bank connectors. The app talks to this interface only;
 * Pennylane (bookkeeping) and Qonto (bank account) are declared here and will
 * be implemented against it. Until then the FEC and CSV exports cover the
 * accountant's needs, and the settings page says the connection is not
 * available yet.
 */

export const ACCOUNTING_PROVIDERS = ["pennylane", "qonto"] as const;
export type AccountingProviderId = (typeof ACCOUNTING_PROVIDERS)[number];

export type ExportedInvoice = {
  reference: string;
  issuedAt: string;
  dueAt: string | null;
  client: { name: string; email: string };
  title: string;
  totalHt: number;
  tax: number;
  totalTtc: number;
};

export type BankTransaction = {
  id: string;
  bookedAt: string;
  amount: number;
  label: string;
  reference: string | null;
};

export interface AccountingProvider {
  id: AccountingProviderId;
  /** Bookkeeping (invoices, payments) or bank (transactions to reconcile). */
  kind: "accounting" | "bank";
  /** API keys are set for this deployment. */
  configured(): boolean;
  /** Pushes an issued invoice to the bookkeeping. */
  pushInvoice(invoice: ExportedInvoice): Promise<{ externalId: string }>;
  /** Bank lines since a date, to match with open invoices. */
  transactions(since: Date): Promise<BankTransaction[]>;
}

export class ConnectorNotAvailable extends Error {
  constructor(provider: AccountingProviderId) {
    super(`${provider} connector is not available yet`);
    this.name = "ConnectorNotAvailable";
  }
}

function stub(
  id: AccountingProviderId,
  kind: AccountingProvider["kind"],
  configured: () => boolean,
): AccountingProvider {
  const unavailable = () => Promise.reject(new ConnectorNotAvailable(id));
  return { id, kind, configured, pushInvoice: unavailable, transactions: unavailable };
}

export const ACCOUNTING: Record<AccountingProviderId, AccountingProvider> = {
  pennylane: stub("pennylane", "accounting", () => Boolean(env.PENNYLANE_API_KEY)),
  qonto: stub("qonto", "bank", () => Boolean(env.QONTO_ORGANIZATION_SLUG && env.QONTO_SECRET_KEY)),
};
