import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { SIGNATURE_BUCKET } from "@/lib/esign/signatures";
import { contractPdf, invoicePdf, serviceOrderPdf } from "@/lib/pdf/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const KINDS = {
  invoice: { table: "ai_conductor_invoices", pdf: invoicePdf, signed: null },
  contract: { table: "ai_conductor_contracts", pdf: contractPdf, signed: "contract" },
  "service-order": {
    table: "ai_conductor_service_orders",
    pdf: serviceOrderPdf,
    signed: "service_order",
  },
} as const;

const isKind = (k: string): k is keyof typeof KINDS => Object.hasOwn(KINDS, k);

/**
 * Invoice, contract or service order as a PDF (quotes have
 * /api/quotes/[id]/pdf). RLS decides who may see the document; a signed
 * document returns its signed copy.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  if (!(await getProfile())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { kind, id } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const spec = KINDS[kind];
  const supabase = await createClient();
  const { data: visible } = await supabase.from(spec.table).select("id").eq("id", id).maybeSingle();
  if (!visible) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (spec.signed) {
    const { data: signed } = await supabase
      .from("ai_conductor_signature_requests")
      .select("signed_pdf_url")
      .eq("document_type", spec.signed)
      .eq("document_id", id)
      .eq("status", "completed")
      .not("signed_pdf_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (signed?.signed_pdf_url) {
      const { data } = await createAdminClient()
        .storage.from(SIGNATURE_BUCKET)
        .createSignedUrl(signed.signed_pdf_url, 60);
      if (data?.signedUrl) return NextResponse.redirect(data.signedUrl);
    }
  }

  const doc = await spec.pdf(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(new Uint8Array(doc.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.kind.replaceAll(" ", "-")}-${doc.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
