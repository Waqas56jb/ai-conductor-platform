import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanyRow, QuoteLine } from "@/lib/db/types";

/** Printed invisibly in the signature box: DocuSign anchors the signature on it. */
export const SIGNATURE_ANCHOR = "\\s1\\";

export type DocumentKind = "Devis" | "Facture" | "Contrat";

/** Everything a devis, a facture or a contrat prints. */
export type DocumentPdfInput = {
  kind: DocumentKind;
  reference: string;
  issuedAt: string;
  /** Under the title: validity, due date or contract period. */
  subtitle: string;
  title: string;
  summary?: string | null;
  lines: readonly QuoteLine[];
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  /** Contract terms, printed after the totals. */
  terms?: string;
  company: Pick<
    CompanyRow,
    "name" | "siret" | "vat_number" | "address" | "postal_code" | "city" | "email" | "phone"
  >;
  client: { name: string; email: string };
  site: string;
  /** Signature box with the DocuSign anchor (quotes and contracts). */
  signature: boolean;
};

// The built-in Helvetica covers French (WinAnsi), but not the narrow
// no-break spaces Intl puts in French numbers: use plain spaces.
export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
    .format(n)
    .replace(/[  ]/g, " ");
export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const BLUE = "#1d4ed8";
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
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
  terms: { marginTop: 20, lineHeight: 1.45 },
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

/** A company document (devis, facture, contrat) as a PDF. */
export async function renderDocumentPdf(d: DocumentPdfInput): Promise<Buffer> {
  const { company } = d;
  const companyLines = [
    [company.address, [company.postal_code, company.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    [company.email, company.phone].filter(Boolean).join(" · "),
    company.siret ? `SIRET ${company.siret}` : "",
    company.vat_number ? `TVA ${company.vat_number}` : "",
  ].filter(Boolean);

  const doc = (
    <Document title={`${d.kind} ${d.reference}`} author={company.name} creator="Pratonna">
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

        <Text style={s.title}>
          {d.kind} {d.reference}
        </Text>
        <Text style={s.muted}>
          Émis le {longDate(d.issuedAt)} · {d.subtitle}
        </Text>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Client</Text>
            <Text style={s.bold}>{d.client.name}</Text>
            <Text>{d.client.email}</Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Objet</Text>
            <Text style={s.bold}>{d.title}</Text>
            {d.site ? <Text>{d.site}</Text> : null}
          </View>
        </View>

        {d.summary ? <Text style={{ marginTop: 14 }}>{d.summary}</Text> : null}

        <View style={s.table}>
          <View style={s.row}>
            <Text style={[s.cLabel, s.th]}>Désignation</Text>
            <Text style={[s.cNum, s.th]}>Qté</Text>
            <Text style={[s.cNum, s.th]}>PU HT</Text>
            <Text style={[s.cNum, s.th]}>Total HT</Text>
          </View>
          {d.lines.map((l, i) => (
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
            <Text>{eur(d.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>TVA {d.taxRate} %</Text>
            <Text>{eur(d.tax)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text style={s.bold}>Total TTC</Text>
            <Text style={s.bold}>{eur(d.total)}</Text>
          </View>
        </View>

        {d.terms ? (
          <View style={s.terms}>
            <Text style={s.label}>Conditions</Text>
            <Text>{d.terms}</Text>
          </View>
        ) : null}

        {d.signature ? (
          <View style={s.sign} wrap={false}>
            <Text style={s.label}>Bon pour accord — signature du client</Text>
            <Text style={s.anchor}>{SIGNATURE_ANCHOR}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {company.name} — {d.kind.toLowerCase()} {d.reference}
          {d.signature ? ". Signature électronique via DocuSign." : "."}
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
