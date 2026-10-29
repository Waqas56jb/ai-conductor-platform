import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { quotePdf, SIGNATURE_BUCKET } from "@/lib/esign/signatures";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The quote as a PDF: the signed copy once DocuSign completed it, otherwise
 * the current version. RLS decides who may see the quote.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getProfile())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("ai_conductor_quotations")
    .select("id, reference")
    .eq("id", id)
    .maybeSingle();
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: signed } = await supabase
    .from("ai_conductor_signature_requests")
    .select("signed_pdf_url")
    .eq("document_type", "quotation")
    .eq("document_id", quote.id)
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

  const doc = await quotePdf(quote.id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(new Uint8Array(doc.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Devis-${doc.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
