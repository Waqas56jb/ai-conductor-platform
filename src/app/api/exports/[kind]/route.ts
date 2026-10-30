import { NextResponse, type NextRequest } from "next/server";
import { REPORT_ROLES } from "@/lib/accounting/access";
import { toCsv } from "@/lib/accounting/csv";
import { buildFec, fecFileName } from "@/lib/accounting/fec";
import { cents, paidOf, parisDay } from "@/lib/accounting/ledger";
import { audit } from "@/lib/audit";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const KINDS = ["fec", "invoices", "payments"] as const;
type Kind = (typeof KINDS)[number];

const METHOD: Record<string, string> = {
  transfer: "Virement",
  sepa_debit: "Prélèvement SEPA",
  card: "Carte",
  cheque: "Chèque",
  cash: "Espèces",
  other: "Autre",
};
const STATUS: Record<string, string> = {
  unpaid: "À payer",
  under_review: "Justificatif à vérifier",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

/**
 * Accounting exports of one calendar year (the fiscal year of most SMEs):
 * the FEC, and the invoices / payments as CSV. Reads go through RLS.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!REPORT_ROLES.includes(profile.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { kind } = await params;
  if (!(KINDS as readonly string[]).includes(kind))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const current = Number(parisDay(new Date()).slice(0, 4));
  const year = Number(request.nextUrl.searchParams.get("year") ?? current);
  if (!Number.isInteger(year) || year < 2000 || year > current)
    return NextResponse.json({ error: "bad year" }, { status: 400 });

  const supabase = await createClient();
  const inYear = (iso: string | null) => iso !== null && parisDay(iso).startsWith(`${year}-`);
  const [{ data: company }, { data: invoices }, { data: payments }, { data: people }] =
    await Promise.all([
      supabase.from("ai_conductor_companies").select("siret").eq("id", profile.company_id).single(),
      supabase
        .from("ai_conductor_invoices")
        .select(
          "id, reference, title, amount, status, issued_at, due_at, paid_at, client_id, quotation_id",
        )
        .order("issued_at")
        .limit(10000),
      supabase
        .from("ai_conductor_payments")
        .select("invoice_id, amount, method, status, reference, paid_at, source")
        .order("paid_at")
        .limit(20000),
      supabase.from("ai_conductor_users").select("id, display_name, email").eq("role", "client"),
    ]);
  const name = new Map((people ?? []).map((p) => [p.id, p.display_name || p.email]));
  const allInvoices = invoices ?? [];
  const allPayments = payments ?? [];
  const reference = new Map(allInvoices.map((i) => [i.id, i]));

  let body: string;
  let filename: string;
  let type = "text/csv; charset=utf-8";

  if ((kind as Kind) === "fec") {
    // Issued (not cancelled) invoices of the year, and the verified payments of the year.
    const issued = allInvoices.filter((i) => i.status !== "cancelled" && inYear(i.issued_at));
    const quoteIds = issued.flatMap((i) => (i.quotation_id ? [i.quotation_id] : []));
    const { data: quotes } = quoteIds.length
      ? await supabase.from("ai_conductor_quotations").select("id, tax_amount").in("id", quoteIds)
      : { data: [] };
    const taxOf = new Map((quotes ?? []).map((q) => [q.id, Number(q.tax_amount)]));
    body = buildFec(
      issued.map((i) => ({
        id: i.id,
        reference: i.reference,
        issuedAt: i.issued_at,
        title: i.title,
        clientId: i.client_id,
        clientName: (i.client_id && name.get(i.client_id)) || "",
        total: Number(i.amount),
        tax: i.quotation_id ? (taxOf.get(i.quotation_id) ?? 0) : 0,
      })),
      allPayments
        .filter((p) => p.status === "verified" && p.paid_at && inYear(p.paid_at))
        .map((p) => {
          const inv = reference.get(p.invoice_id);
          return {
            invoiceId: p.invoice_id,
            invoiceReference: inv?.reference ?? "",
            clientId: inv?.client_id ?? null,
            clientName: (inv?.client_id && name.get(inv.client_id)) || "",
            paidAt: p.paid_at as string,
            amount: Number(p.amount),
            reference: p.reference,
          };
        }),
    );
    filename = fecFileName(company?.siret ?? null, `${year}-12-31`);
    type = "text/plain; charset=utf-8";
  } else if (kind === "invoices") {
    body = toCsv(
      [
        "Facture",
        "Date",
        "Échéance",
        "Client",
        "Objet",
        "Montant TTC",
        "Réglé",
        "Reste dû",
        "Statut",
      ],
      allInvoices
        .filter((i) => inYear(i.issued_at))
        .map((i) => {
          const paid = paidOf(allPayments.filter((p) => p.invoice_id === i.id));
          return [
            i.reference,
            parisDay(i.issued_at),
            i.due_at ? parisDay(i.due_at) : "",
            (i.client_id && name.get(i.client_id)) || "",
            i.title,
            Number(i.amount),
            paid,
            i.status === "cancelled" ? 0 : Math.max(0, cents(Number(i.amount) - paid)),
            STATUS[i.status] ?? i.status,
          ];
        }),
    );
    filename = `factures-${year}.csv`;
  } else {
    body = toCsv(
      ["Date", "Facture", "Client", "Mode", "Référence", "Montant", "Statut", "Origine"],
      allPayments
        .filter((p) => inYear(p.paid_at))
        .map((p) => {
          const inv = reference.get(p.invoice_id);
          return [
            parisDay(p.paid_at as string),
            inv?.reference ?? "",
            (inv?.client_id && name.get(inv.client_id)) || "",
            METHOD[p.method] ?? p.method,
            p.reference ?? "",
            Number(p.amount),
            p.status === "verified" ? "Vérifié" : p.status === "rejected" ? "Rejeté" : "En attente",
            p.source === "receipt"
              ? "Justificatif client"
              : p.source === "bank"
                ? "Banque"
                : "Saisie",
          ];
        }),
    );
    filename = `paiements-${year}.csv`;
  }

  await audit(profile, `export.${kind}`, { type: "company", id: profile.company_id }, { year });
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
