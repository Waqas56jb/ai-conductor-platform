import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { longDate, renderDocumentPdf, type DocumentPdfInput } from "./document";

/**
 * Builds the PDF of a quote, an invoice or a contract from the database.
 * Callers check first that the user may see the document (RLS).
 */

export type PdfDocument = { pdf: Buffer; reference: string; kind: DocumentPdfInput["kind"] };

const BILLING: Record<"one_off" | "monthly" | "yearly", string> = {
  one_off: "Forfait",
  monthly: "Mensuel",
  yearly: "Annuel",
};

async function parties(companyId: string, clientId: string | null, incidentId: string | null) {
  const admin = createAdminClient();
  const [{ data: company }, { data: client }, { data: incident }] = await Promise.all([
    admin.from("ai_conductor_companies").select("*").eq("id", companyId).single(),
    clientId
      ? admin.from("ai_conductor_users").select("display_name, email").eq("id", clientId).single()
      : Promise.resolve({ data: null }),
    incidentId
      ? admin
          .from("ai_conductor_incidents")
          .select("building_address, city")
          .eq("id", incidentId)
          .single()
      : Promise.resolve({ data: null }),
  ]);
  return {
    company,
    client: { name: client?.display_name || client?.email || "", email: client?.email ?? "" },
    site: [incident?.building_address, incident?.city].filter(Boolean).join(", "),
  };
}

export async function quotePdf(quoteId: string): Promise<PdfDocument | null> {
  const { data: q } = await createAdminClient()
    .from("ai_conductor_quotations")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (!q) return null;
  const { company, client, site } = await parties(q.company_id, q.client_id, q.incident_id);
  if (!company) return null;
  const pdf = await renderDocumentPdf({
    kind: "Devis",
    reference: q.reference,
    issuedAt: q.created_at,
    subtitle: `valable ${q.validity_days} jours`,
    title: q.title,
    summary: q.summary,
    lines: q.line_items,
    taxRate: Number(q.tax_rate),
    subtotal: Number(q.subtotal_ht),
    tax: Number(q.tax_amount),
    total: Number(q.total_ttc),
    company,
    client,
    site,
    signature: true,
  });
  return { pdf, reference: q.reference, kind: "Devis" };
}

/** An invoice prints the lines of its quote; without one, a single line. */
export async function invoicePdf(invoiceId: string): Promise<PdfDocument | null> {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("ai_conductor_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return null;
  const { data: quote } = inv.quotation_id
    ? await admin
        .from("ai_conductor_quotations")
        .select("line_items, tax_rate, subtotal_ht, tax_amount")
        .eq("id", inv.quotation_id)
        .maybeSingle()
    : { data: null };
  const { company, client, site } = await parties(inv.company_id, inv.client_id, inv.incident_id);
  if (!company) return null;
  const total = Number(inv.amount);
  const taxRate = quote ? Number(quote.tax_rate) : 20;
  const subtotal = quote
    ? Number(quote.subtotal_ht)
    : Math.round((total / (1 + taxRate / 100)) * 100) / 100;
  const pdf = await renderDocumentPdf({
    kind: "Facture",
    reference: inv.reference,
    issuedAt: inv.issued_at,
    subtitle: inv.due_at ? `échéance le ${longDate(inv.due_at)}` : "payable à réception",
    title: inv.title,
    lines: quote?.line_items ?? [{ label: inv.title, quantity: 1, unit_price_ht: subtotal }],
    taxRate,
    subtotal,
    tax: quote ? Number(quote.tax_amount) : Math.round((total - subtotal) * 100) / 100,
    total,
    terms:
      "Paiement à 30 jours. En cas de retard, pénalités au taux légal en vigueur et indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du Code de commerce).",
    company,
    client,
    site,
    signature: false,
  });
  return { pdf, reference: inv.reference, kind: "Facture" };
}

export async function contractPdf(contractId: string): Promise<PdfDocument | null> {
  const { data: c } = await createAdminClient()
    .from("ai_conductor_contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  if (!c) return null;
  const { company, client, site } = await parties(c.company_id, c.client_id, c.incident_id);
  if (!company) return null;
  const period = c.end_date
    ? `du ${longDate(c.start_date)} au ${longDate(c.end_date)}`
    : `à partir du ${longDate(c.start_date)}`;
  const pdf = await renderDocumentPdf({
    kind: "Contrat",
    reference: c.reference,
    issuedAt: c.created_at,
    subtitle: period,
    title: c.title,
    lines: [
      {
        label: `${c.title} — ${BILLING[c.billing].toLowerCase()}`,
        quantity: 1,
        unit_price_ht: Number(c.amount_ht),
      },
    ],
    taxRate: Number(c.tax_rate),
    subtotal: Number(c.amount_ht),
    tax: Math.round((Number(c.total_ttc) - Number(c.amount_ht)) * 100) / 100,
    total: Number(c.total_ttc),
    terms: c.terms,
    company,
    client,
    site,
    signature: true,
  });
  return { pdf, reference: c.reference, kind: "Contrat" };
}
