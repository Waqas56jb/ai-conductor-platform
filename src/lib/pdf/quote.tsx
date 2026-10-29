import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanyRow, QuotationRow } from "@/lib/db/types";

/** Printed invisibly in the signature box: DocuSign anchors the signature on it. */
export const SIGNATURE_ANCHOR = "\\s1\\";

export type QuotePdfInput = {
  quote: Pick<
    QuotationRow,
    | "reference"
    | "title"
    | "summary"
    | "line_items"
    | "tax_rate"
    | "subtotal_ht"
    | "tax_amount"
    | "total_ttc"
    | "validity_days"
    | "created_at"
  >;
  company: Pick<
    CompanyRow,
    "name" | "siret" | "vat_number" | "address" | "postal_code" | "city" | "email" | "phone"
  >;
  client: { name: string; email: string };
  site: string;
};

// The built-in Helvetica covers French (WinAnsi), but not the narrow
// no-break spaces Intl puts in French numbers: use plain spaces.
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(n)
    .replace(/[  ]/g, " ");
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const BLUE = "#1d4ed8";
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 150, height: 30, objectFit: "contain" },
  muted: { color: "#6b7280" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLUE, marginTop: 24 },
  parties: { flexDirection: "row", gap: 16, marginTop: 18 },
  party: { flex: 1, padding: 10, borderRadius: 4, backgroundColor: "#f3f4f6" },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 18, borderTopWidth: 1, borderColor: "#e5e7eb" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#6b7280", textTransform: "uppercase" },
  cLabel: { flex: 1 },
  cNum: { width: 70, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1, borderColor: "#111827", marginTop: 4, paddingTop: 6, fontSize: 12 },
  sign: {
    marginTop: 28,
    marginLeft: "auto",
    width: 260,
    height: 90,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
  },
  anchor: { color: "#ffffff", fontSize: 6, marginTop: 14 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#6b7280" },
});

let logo: Promise<Buffer> | null = null;
const loadLogo = () => (logo ??= readFile(join(process.cwd(), "public/brand/logo-color.png")));

/** The quote as a PDF, ready to send for signature or to download. */
export async function renderQuotePdf({
  quote,
  company,
  client,
  site,
}: QuotePdfInput): Promise<Buffer> {
  const companyLines = [
    [company.address, [company.postal_code, company.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    [company.email, company.phone].filter(Boolean).join(" · "),
    company.siret ? `SIRET ${company.siret}` : "",
    company.vat_number ? `TVA ${company.vat_number}` : "",
  ].filter(Boolean);

  const doc = (
    <Document title={`Devis ${quote.reference}`} author={company.name} creator="Pratonna">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image>, not an HTML <img> */}
          <Image style={s.logo} src={await loadLogo()} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.bold}>{company.name}</Text>
            {companyLines.map((line) => (
              <Text key={line} style={s.muted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <Text style={s.title}>Devis {quote.reference}</Text>
        <Text style={s.muted}>
          Émis le {date(quote.created_at)} · valable {quote.validity_days} jours
        </Text>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Client</Text>
            <Text style={s.bold}>{client.name}</Text>
            <Text>{client.email}</Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Objet</Text>
            <Text style={s.bold}>{quote.title}</Text>
            {site ? <Text>{site}</Text> : null}
          </View>
        </View>

        {quote.summary ? <Text style={{ marginTop: 14 }}>{quote.summary}</Text> : null}

        <View style={s.table}>
          <View style={s.row}>
            <Text style={[s.cLabel, s.th]}>Désignation</Text>
            <Text style={[s.cNum, s.th]}>Qté</Text>
            <Text style={[s.cNum, s.th]}>PU HT</Text>
            <Text style={[s.cNum, s.th]}>Total HT</Text>
          </View>
          {quote.line_items.map((l, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.cLabel}>{l.label}</Text>
              <Text style={s.cNum}>{l.quantity}</Text>
              <Text style={s.cNum}>{eur(l.unit_price_ht)}</Text>
              <Text style={s.cNum}>{eur(l.quantity * l.unit_price_ht)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Total HT</Text>
            <Text>{eur(Number(quote.subtotal_ht))}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>TVA {quote.tax_rate} %</Text>
            <Text>{eur(Number(quote.tax_amount))}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text style={s.bold}>Total TTC</Text>
            <Text style={s.bold}>{eur(Number(quote.total_ttc))}</Text>
          </View>
        </View>

        <View style={s.sign} wrap={false}>
          <Text style={s.label}>Bon pour accord — signature du client</Text>
          <Text style={s.anchor}>{SIGNATURE_ANCHOR}</Text>
        </View>

        <Text style={s.footer} fixed>
          {company.name} — devis {quote.reference}. Signature électronique via DocuSign.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
