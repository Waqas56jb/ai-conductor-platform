import { cents, parisDay } from "./ledger";

/**
 * Fichier des Écritures Comptables (art. A47 A-1 du LPF): one line per entry
 * line, 18 tab-separated columns, dates YYYYMMDD, amounts with a decimal comma.
 *
 * - VE (ventes): each invoice debits the client (411) for the TTC and
 *   credits the sales (706) for the HT and the VAT collected (44571);
 * - BQ (banque): each verified payment debits the bank (512) and credits the client.
 *
 * A fully paid invoice letters its client lines (same EcritureLet on the
 * invoice and on its payments). The chart of accounts is the standard PCG one.
 */

export const FEC_COLUMNS = [
  "JournalCode",
  "JournalLib",
  "EcritureNum",
  "EcritureDate",
  "CompteNum",
  "CompteLib",
  "CompAuxNum",
  "CompAuxLib",
  "PieceRef",
  "PieceDate",
  "EcritureLib",
  "Debit",
  "Credit",
  "EcritureLet",
  "DateLet",
  "ValidDate",
  "Montantdevise",
  "Idevise",
] as const;

export type FecInvoice = {
  id: string;
  reference: string;
  issuedAt: string;
  title: string;
  clientId: string | null;
  clientName: string;
  /** TTC; `tax` is the VAT inside it. */
  total: number;
  tax: number;
};

export type FecPayment = {
  invoiceId: string;
  /** The invoice may be from an earlier year: its details travel with the payment. */
  invoiceReference: string;
  clientId: string | null;
  clientName: string;
  paidAt: string;
  amount: number;
  reference: string | null;
};

const ACCOUNTS = {
  client: ["411000", "Clients"],
  sales: ["706000", "Prestations de services"],
  vat: ["445710", "TVA collectée"],
  bank: ["512000", "Banque"],
} as const;

const JOURNALS = { VE: "Ventes", BQ: "Banque" } as const;

const day = (iso: string) => parisDay(iso).replaceAll("-", "");
const amount = (n: number) => cents(n).toFixed(2).replace(".", ",");
// No tab, line break or pipe may appear inside a field.
const text = (s: string) => s.replace(/[\t\r\n|]+/g, " ").trim();
/** Client sub-account: stable, from the client's id. */
const auxOf = (clientId: string | null) =>
  clientId ? `C${clientId.replace(/-/g, "").slice(0, 8).toUpperCase()}` : "CDIVERS";

/** AAA, AAB, … : lettering codes. */
export function letterCode(n: number) {
  const a = (k: number) => String.fromCharCode(65 + (k % 26));
  return a(Math.floor(n / 676)) + a(Math.floor(n / 26)) + a(n);
}

type Line = {
  journal: keyof typeof JOURNALS;
  num: string;
  date: string;
  account: readonly [string, string];
  aux?: { num: string; name: string };
  piece: string;
  pieceDate: string;
  label: string;
  debit: number;
  credit: number;
  letter?: { code: string; date: string };
};

export function buildFec(invoices: readonly FecInvoice[], payments: readonly FecPayment[]): string {
  const byInvoice = new Map<string, FecPayment[]>();
  for (const p of payments) byInvoice.set(p.invoiceId, [...(byInvoice.get(p.invoiceId) ?? []), p]);

  // Lettering: invoices whose payments cover the whole amount.
  const letters = new Map<string, { code: string; date: string }>();
  const sortedInvoices = [...invoices].sort(
    (a, b) => a.issuedAt.localeCompare(b.issuedAt) || a.reference.localeCompare(b.reference),
  );
  for (const inv of sortedInvoices) {
    const paid = byInvoice.get(inv.id) ?? [];
    const sum = cents(paid.reduce((s, p) => s + p.amount, 0));
    if (paid.length && sum >= cents(inv.total)) {
      const last = paid
        .map((p) => p.paidAt)
        .sort()
        .at(-1)!;
      letters.set(inv.id, { code: letterCode(letters.size), date: day(last) });
    }
  }

  const lines: Line[] = [];
  sortedInvoices.forEach((inv, i) => {
    const num = `VE${String(i + 1).padStart(6, "0")}`;
    const date = day(inv.issuedAt);
    const aux = { num: auxOf(inv.clientId), name: text(inv.clientName) || "Client divers" };
    const label = text(`Facture ${inv.reference} ${inv.title}`).slice(0, 200);
    const tax = cents(inv.tax);
    // Balanced by construction: HT is what the VAT leaves of the TTC.
    const ht = cents(inv.total - tax);
    const base = {
      journal: "VE" as const,
      num,
      date,
      piece: inv.reference,
      pieceDate: date,
      label,
    };
    lines.push({
      ...base,
      account: ACCOUNTS.client,
      aux,
      debit: inv.total,
      credit: 0,
      letter: letters.get(inv.id),
    });
    lines.push({ ...base, account: ACCOUNTS.sales, debit: 0, credit: ht });
    if (tax > 0) lines.push({ ...base, account: ACCOUNTS.vat, debit: 0, credit: tax });
  });

  const sortedPayments = [...payments].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  sortedPayments.forEach((p, i) => {
    const num = `BQ${String(i + 1).padStart(6, "0")}`;
    const date = day(p.paidAt);
    const base = {
      journal: "BQ" as const,
      num,
      date,
      piece: text(p.reference ?? "") || p.invoiceReference,
      pieceDate: date,
      label: text(`Règlement facture ${p.invoiceReference}`),
    };
    lines.push({ ...base, account: ACCOUNTS.bank, debit: p.amount, credit: 0 });
    lines.push({
      ...base,
      account: ACCOUNTS.client,
      aux: { num: auxOf(p.clientId), name: text(p.clientName) || "Client divers" },
      debit: 0,
      credit: p.amount,
      letter: letters.get(p.invoiceId),
    });
  });

  const rows = lines
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.journal.localeCompare(b.journal) ||
        a.num.localeCompare(b.num),
    )
    .map((l) =>
      [
        l.journal,
        JOURNALS[l.journal],
        l.num,
        l.date,
        l.account[0],
        l.account[1],
        l.aux?.num ?? "",
        l.aux?.name ?? "",
        l.piece,
        l.pieceDate,
        l.label,
        amount(l.debit),
        amount(l.credit),
        l.letter?.code ?? "",
        l.letter?.date ?? "",
        l.date,
        "",
        "",
      ].join("\t"),
    );
  return [FEC_COLUMNS.join("\t"), ...rows].join("\r\n") + "\r\n";
}

/** SIREN + "FEC" + closing date, e.g. 123456789FEC20261231.txt */
export const fecFileName = (siret: string | null, closing: string) =>
  `${siret?.slice(0, 9) ?? "000000000"}FEC${closing.replaceAll("-", "")}.txt`;
