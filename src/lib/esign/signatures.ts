import "server-only";
import { audit } from "@/lib/audit";
import type { Profile } from "@/lib/auth/session";
import { office, transition } from "@/lib/cases/transition";
import { env } from "@/lib/env";
import { notify } from "@/lib/notify";
import { renderQuotePdf, SIGNATURE_ANCHOR } from "@/lib/pdf/quote";
import { createAdminClient } from "@/lib/supabase/admin";
import { docusign } from "./docusign";
import type { SignatureStatus } from "./provider";

export const SIGNATURE_BUCKET = "ai-conductor-signatures";

/** The configured provider, or null: the UI then says signing is not configured. */
export const esign = docusign;
export const esignConfigured = () => esign() !== null;

const PROFILE_COLUMNS = "id, email, role, display_name, phone, photo_url, locale, company_id";

/** The quote as the PDF DocuSign gets (and the client can download). */
export async function quotePdf(
  quoteId: string,
): Promise<{ pdf: Buffer; reference: string } | null> {
  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("ai_conductor_quotations")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return null;
  const [{ data: company }, { data: client }, { data: incident }] = await Promise.all([
    admin.from("ai_conductor_companies").select("*").eq("id", quote.company_id).single(),
    quote.client_id
      ? admin
          .from("ai_conductor_users")
          .select("display_name, email")
          .eq("id", quote.client_id)
          .single()
      : Promise.resolve({ data: null }),
    quote.incident_id
      ? admin
          .from("ai_conductor_incidents")
          .select("building_address, city")
          .eq("id", quote.incident_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);
  if (!company) return null;
  const pdf = await renderQuotePdf({
    quote,
    company,
    client: { name: client?.display_name || client?.email || "", email: client?.email ?? "" },
    site: [incident?.building_address, incident?.city].filter(Boolean).join(", "),
  });
  return { pdf, reference: quote.reference };
}

/** Sends the quote to DocuSign for the client to sign; returns the request id. */
export async function sendQuoteForSignature(
  signer: Profile,
  quote: { id: string; reference: string; incident_id: string | null },
): Promise<string> {
  const provider = esign();
  if (!provider) throw new Error("e-signature not configured");
  const doc = await quotePdf(quote.id);
  if (!doc) throw new Error("quote not found");
  const { envelopeId } = await provider.createEnvelope({
    pdf: doc.pdf,
    documentName: `Devis ${doc.reference}.pdf`,
    subject: `Devis ${doc.reference} à signer`,
    signer: {
      email: signer.email,
      name: signer.display_name || signer.email,
      clientUserId: signer.id,
    },
    anchor: SIGNATURE_ANCHOR,
    webhookUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/docusign`,
  });
  const { data, error } = await createAdminClient()
    .from("ai_conductor_signature_requests")
    .insert({
      company_id: signer.company_id,
      document_type: "quotation",
      document_id: quote.id,
      incident_id: quote.incident_id,
      envelope_id: envelopeId,
      signer_id: signer.id,
      signer_email: signer.email,
      status: "sent",
      events: [{ status: "sent", at: new Date().toISOString(), source: "app" }],
      created_by: signer.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`signature request not saved: ${error?.message}`);
  await audit(
    signer,
    "esign.sent",
    { type: "signature_request", id: data.id },
    {
      envelope_id: envelopeId,
      document_type: "quotation",
      document_id: quote.id,
    },
  );
  return data.id;
}

/**
 * Records a status from the webhook or a poll. Idempotent: a status already
 * recorded (or a final one) is ignored. A completed envelope stores the signed
 * PDF and moves the document's workflow forward.
 */
export async function applyEnvelopeStatus(
  envelopeId: string,
  status: SignatureStatus,
  source: "webhook" | "poll",
): Promise<void> {
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("ai_conductor_signature_requests")
    .select("*")
    .eq("envelope_id", envelopeId)
    .maybeSingle();
  if (!req || req.status === status || ["completed", "declined", "voided"].includes(req.status))
    return;

  // Claim the change: only one of webhook / poll gets to apply it.
  const at = new Date().toISOString();
  const { data: claimed } = await admin
    .from("ai_conductor_signature_requests")
    .update({
      status,
      events: [...req.events, { status, at, source }],
      ...(status === "completed" ? { completed_at: at } : {}),
    })
    .eq("id", req.id)
    .eq("status", req.status)
    .select("id");
  if (!claimed?.length) return;

  const { data: signer } = req.signer_id
    ? await admin
        .from("ai_conductor_users")
        .select(PROFILE_COLUMNS)
        .eq("id", req.signer_id)
        .single()
    : { data: null };
  const actor = signer ?? {
    id: req.created_by ?? req.signer_id ?? "",
    role: "client" as const,
    company_id: req.company_id,
  };
  await audit(
    actor,
    `esign.${status}`,
    { type: "signature_request", id: req.id },
    {
      envelope_id: envelopeId,
      source,
    },
  );

  if (req.document_type !== "quotation") return;
  const { data: quote } = await admin
    .from("ai_conductor_quotations")
    .select("id, reference, incident_id, title")
    .eq("id", req.document_id)
    .single();
  if (!quote) return;

  if (status === "completed") {
    const provider = esign();
    if (provider) {
      const pdf = await provider.signedPdf(envelopeId);
      const path = `${req.company_id}/${quote.id}/${envelopeId}.pdf`;
      const { error } = await admin.storage
        .from(SIGNATURE_BUCKET)
        .upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (!error)
        await admin
          .from("ai_conductor_signature_requests")
          .update({ signed_pdf_url: path })
          .eq("id", req.id);
      else console.error("[esign] signed PDF not stored", error.message);
    }
    // The signature is the client's acceptance: same transition as in the panel.
    if (signer && quote.incident_id) {
      const { data: incident } = await admin
        .from("ai_conductor_incidents")
        .select("*")
        .eq("id", quote.incident_id)
        .single();
      if (incident?.status === "sent_to_client") {
        const r = await transition(signer, incident, "client_accept", {
          role: signer.role,
          isReporter: incident.client_id === signer.id,
        });
        if (r.ok) {
          await admin
            .from("ai_conductor_quotations")
            .update({ status: "accepted", signed_at: at })
            .eq("id", quote.id);
          await notify({
            companyId: req.company_id,
            userIds: [...(await office(req.company_id)), ...incident.hired_tech_ids],
            type: "quotation",
            title: `Devis ${quote.reference} signé par le client`,
            body: incident.title,
            incidentId: incident.id,
            quotationId: quote.id,
          });
        }
      }
    }
  } else if (status === "declined") {
    await notify({
      companyId: req.company_id,
      userIds: await office(req.company_id),
      type: "quotation",
      title: `Signature du devis ${quote.reference} refusée`,
      body: quote.title,
      incidentId: quote.incident_id ?? undefined,
      quotationId: quote.id,
    });
  }
}
