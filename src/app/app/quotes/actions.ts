"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { applyEnvelopeStatus, esign, sendForSignature } from "@/lib/esign/signatures";
import { createClient } from "@/lib/supabase/server";

type SigningResult = { ok: true; url: string; requestId: string } | { ok: false; error: string };

/**
 * The client opens DocuSign to sign a quote sent to them. An envelope still
 * open for this quote is reused, so reopening never sends a second one.
 */
export async function startQuoteSigning(quoteId: string): Promise<SigningResult> {
  const profile = await requireProfile();
  const provider = esign();
  if (!provider) return { ok: false, error: "quotes.sign.notConfigured" };
  if (profile.role !== "client") return { ok: false, error: "common.forbidden" };
  if (
    !z
      .string()
      .regex(/^DEV-[A-Z0-9-]{4,40}$/)
      .safeParse(quoteId).success
  )
    return { ok: false, error: "quotes.sign.notFound" };

  // RLS: the client only sees their own quotes.
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("ai_conductor_quotations")
    .select("id, reference, incident_id, status, client_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote || quote.client_id !== profile.id) return { ok: false, error: "quotes.sign.notFound" };
  if (quote.status !== "sent_to_client") return { ok: false, error: "quotes.sign.notSignable" };

  try {
    const { data: open } = await supabase
      .from("ai_conductor_signature_requests")
      .select("id, envelope_id")
      .eq("document_type", "quotation")
      .eq("document_id", quote.id)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const requestId =
      open?.id ??
      (await sendForSignature(profile, {
        type: "quotation",
        id: quote.id,
        incident_id: quote.incident_id,
      }));
    const envelopeId =
      open?.envelope_id ??
      (
        await supabase
          .from("ai_conductor_signature_requests")
          .select("envelope_id")
          .eq("id", requestId)
          .single()
      ).data?.envelope_id;
    if (!envelopeId) return { ok: false, error: "quotes.sign.failed" };
    const url = await provider.signingUrl({
      envelopeId,
      signer: {
        email: profile.email,
        name: profile.display_name || profile.email,
        clientUserId: profile.id,
      },
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/esign/return?r=${requestId}`,
      frameOrigin: new URL(env.NEXT_PUBLIC_APP_URL).origin,
    });
    revalidatePath("/app/quotes");
    return { ok: true, url, requestId };
  } catch (e) {
    console.error("[esign] start failed", e);
    return { ok: false, error: "quotes.sign.failed" };
  }
}

/** After the signing page closes: asks DocuSign for the status (the webhook may lag). */
export async function syncSignature(requestId: string): Promise<{ ok: boolean }> {
  await requireProfile();
  const provider = esign();
  if (!provider || !z.uuid().safeParse(requestId).success) return { ok: false };
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("ai_conductor_signature_requests")
    .select("envelope_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { ok: false };
  try {
    const status = await provider.status(req.envelope_id);
    if (status) await applyEnvelopeStatus(req.envelope_id, status, "poll");
  } catch (e) {
    console.error("[esign] sync failed", e);
    return { ok: false };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}
