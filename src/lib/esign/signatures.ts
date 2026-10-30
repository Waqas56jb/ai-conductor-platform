import "server-only";
import { audit } from "@/lib/audit";
import type { Profile } from "@/lib/auth/session";
import { office, transition } from "@/lib/cases/transition";
import { env } from "@/lib/env";
import { notify } from "@/lib/notify";
import { SIGNATURE_ANCHOR } from "@/lib/pdf/document";
import { contractPdf, quotePdf } from "@/lib/pdf/documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { docusign } from "./docusign";
import type { SignatureStatus } from "./provider";

export const SIGNATURE_BUCKET = "ai-conductor-signatures";

/** The configured provider, or null: the UI then says signing is not configured. */
export const esign = docusign;
export const esignConfigured = () => esign() !== null;

const PROFILE_COLUMNS = "id, email, role, display_name, phone, photo_url, locale, company_id";

export type SignableDocument = {
  type: "quotation" | "contract";
  id: string;
  incident_id: string | null;
};

/** Sends a quote or a contract to DocuSign for the signer; returns the request id. */
export async function sendForSignature(signer: Profile, doc: SignableDocument): Promise<string> {
  const provider = esign();
  if (!provider) throw new Error("e-signature not configured");
  const file = doc.type === "quotation" ? await quotePdf(doc.id) : await contractPdf(doc.id);
  if (!file) throw new Error(`${doc.type} not found`);
  const { envelopeId } = await provider.createEnvelope({
    pdf: file.pdf,
    documentName: `${file.kind} ${file.reference}.pdf`,
    subject: `${file.kind} ${file.reference} à signer`,
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
      document_type: doc.type,
      document_id: doc.id,
      incident_id: doc.incident_id,
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
      document_type: doc.type,
      document_id: doc.id,
    },
  );
  return data.id;
}

/** Copies the signed document (with its certificate) to the private signatures bucket. */
async function storeSignedPdf(
  req: { id: string; company_id: string; document_id: string },
  envelopeId: string,
) {
  const provider = esign();
  if (!provider) return;
  const admin = createAdminClient();
  const pdf = await provider.signedPdf(envelopeId);
  const path = `${req.company_id}/${req.document_id}/${envelopeId}.pdf`;
  const { error } = await admin.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) console.error("[esign] signed PDF not stored", error.message);
  else
    await admin
      .from("ai_conductor_signature_requests")
      .update({ signed_pdf_url: path })
      .eq("id", req.id);
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

  if (status === "completed") await storeSignedPdf(req, envelopeId);

  if (req.document_type === "contract") {
    const { data: contract } = await admin
      .from("ai_conductor_contracts")
      .select("id, reference, title, status")
      .eq("id", req.document_id)
      .single();
    if (!contract) return;
    if (status === "completed" && contract.status === "sent")
      await admin
        .from("ai_conductor_contracts")
        .update({ status: "signed", signed_at: at })
        .eq("id", contract.id)
        .eq("status", "sent");
    if (status === "completed" || status === "declined")
      await notify({
        companyId: req.company_id,
        userIds: await office(req.company_id),
        type: "contract",
        title:
          status === "completed"
            ? `Contrat ${contract.reference} signé par le client`
            : `Signature du contrat ${contract.reference} refusée`,
        body: contract.title,
      });
    return;
  }

  if (req.document_type !== "quotation") return;
  const { data: quote } = await admin
    .from("ai_conductor_quotations")
    .select("id, reference, incident_id, title")
    .eq("id", req.document_id)
    .single();
  if (!quote) return;

  if (status === "completed") {
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
