import { NextResponse, type NextRequest } from "next/server";
import { toSignatureStatus } from "@/lib/esign/provider";
import { applyEnvelopeStatus, esign } from "@/lib/esign/signatures";

/**
 * DocuSign Connect (JSON, per-envelope). Every call is HMAC-verified before
 * anything is read; unknown envelopes and events are acknowledged and ignored.
 */
export async function POST(request: NextRequest) {
  const provider = esign();
  if (!provider) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await request.text();
  const signatures = [1, 2, 3, 4, 5]
    .map((i) => request.headers.get(`x-docusign-signature-${i}`))
    .filter((s): s is string => Boolean(s));
  if (!signatures.length || !provider.verifyWebhook(raw, signatures))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let body: { event?: string; data?: { envelopeId?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const status = toSignatureStatus(body.event?.replace(/^envelope-/, ""));
  const envelopeId = body.data?.envelopeId;
  if (status && envelopeId) {
    try {
      await applyEnvelopeStatus(envelopeId, status, "webhook");
    } catch (e) {
      console.error("[esign] webhook failed", e);
      // Not acknowledged: DocuSign retries.
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
