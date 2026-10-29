import "server-only";

/** Envelope states we track (DocuSign's, lower-cased). */
export const SIGNATURE_STATUSES = ["sent", "delivered", "completed", "declined", "voided"] as const;
export type SignatureStatus = (typeof SIGNATURE_STATUSES)[number];

export type Signer = {
  email: string;
  name: string;
  /** Our profile id: makes the signer "embedded" (signs inside the app). */
  clientUserId: string;
};

/**
 * Electronic signature provider. One implementation today (DocuSign); the
 * rest of the app only talks to this interface.
 */
export interface ESignProvider {
  /** Sends `pdf` for signature; the signature goes where the PDF prints the anchor. */
  createEnvelope(input: {
    pdf: Buffer;
    documentName: string;
    subject: string;
    signer: Signer;
    /** Anchor text printed (invisibly) in the PDF where the signature goes. */
    anchor: string;
    /** Per-envelope Connect webhook. */
    webhookUrl: string;
  }): Promise<{ envelopeId: string }>;

  /** One-time URL for embedded signing; DocuSign redirects to `returnUrl` afterwards. */
  signingUrl(input: {
    envelopeId: string;
    signer: Signer;
    returnUrl: string;
    /** Origin allowed to frame the signing page. */
    frameOrigin: string;
  }): Promise<string>;

  status(envelopeId: string): Promise<SignatureStatus | null>;

  /** The signed document, with its certificate of completion. */
  signedPdf(envelopeId: string): Promise<Buffer>;

  /** Connect HMAC check of a webhook body. */
  verifyWebhook(rawBody: string, signatures: readonly string[]): boolean;
}

/** Normalises a provider status to ours; anything else (created, signed…) is ignored. */
export function toSignatureStatus(value: unknown): SignatureStatus | null {
  const s = String(value ?? "").toLowerCase();
  return (SIGNATURE_STATUSES as readonly string[]).includes(s) ? (s as SignatureStatus) : null;
}
