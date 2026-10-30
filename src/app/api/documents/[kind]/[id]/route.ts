import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { SIGNATURE_BUCKET } from "@/lib/esign/signatures";
import { contractPdf, invoicePdf } from "@/lib/pdf/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TABLE = { invoice: "ai_conductor_invoices", contract: "ai_conductor_contracts" } as const;

/**
 * Invoice or contract as a PDF (quotes have /api/quotes/[id]/pdf). RLS decides
 * who may see the document; a signed contract returns its signed copy.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  if (!(await getProfile())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { kind, id } = await params;
  if (kind !== "invoice" && kind !== "contract")
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: visible } = await supabase
    .from(TABLE[kind])
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!visible) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (kind === "contract") {
    const { data: signed } = await supabase
      .from("ai_conductor_signature_requests")
      .select("signed_pdf_url")
      .eq("document_type", "contract")
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

  const doc = kind === "invoice" ? await invoicePdf(id) : await contractPdf(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(new Uint8Array(doc.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.kind}-${doc.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
