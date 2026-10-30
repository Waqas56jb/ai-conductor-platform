import "server-only";
import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { toSignatureStatus, type ESignProvider } from "./provider";

/**
 * DocuSign eSignature REST API v2.1, without the SDK: JWT grant (service
 * integration impersonating DOCUSIGN_USER_ID), envelopes from our PDFs,
 * embedded signing and Connect webhooks signed with HMAC.
 */

type Config = {
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
  baseUrl: string;
  webhookSecret: string;
};

const TOKEN_TTL_S = 3600;

function config(): Config | null {
  const {
    DOCUSIGN_INTEGRATION_KEY: integrationKey,
    DOCUSIGN_USER_ID: userId,
    DOCUSIGN_ACCOUNT_ID: accountId,
    DOCUSIGN_PRIVATE_KEY: privateKey,
    DOCUSIGN_BASE_URL: baseUrl,
    DOCUSIGN_WEBHOOK_SECRET: webhookSecret,
  } = env;
  if (!integrationKey || !userId || !accountId || !privateKey || !webhookSecret) return null;
  return {
    integrationKey,
    userId,
    accountId,
    // Env files often keep the PEM on one line with literal "\n".
    privateKey: privateKey.replace(/\\n/g, "\n"),
    baseUrl: baseUrl.replace(/\/+$/, ""),
    webhookSecret,
  };
}

/** Sandbox accounts authenticate on account-d, production on account. */
const isDemo = (c: Config) => new URL(c.baseUrl).hostname.startsWith("demo");
const authHost = (c: Config) => (isDemo(c) ? "account-d.docusign.com" : "account.docusign.com");
const appsOrigin = (c: Config) =>
  isDemo(c) ? "https://apps-d.docusign.com" : "https://apps.docusign.com";

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(c: Config): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: c.integrationKey,
    sub: c.userId,
    aud: authHost(c),
    iat: now,
    exp: now + TOKEN_TTL_S,
    scope: "signature impersonation",
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(c.privateKey, "base64url");
  const res = await fetch(`https://${authHost(c)}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !body.access_token) {
    // "consent_required": an admin must grant consent once for the integration key.
    throw new Error(`DocuSign token refused: ${body.error ?? res.status}`);
  }
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? TOKEN_TTL_S) * 1000,
  };
  return cached.token;
}

async function api<T>(c: Config, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${c.baseUrl}/v2.1/accounts/${c.accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken(c)}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `DocuSign ${init.method ?? "GET"} ${path} failed: ${res.status} ${detail.slice(0, 300)}`,
    );
  }
  return (
    res.headers.get("content-type")?.includes("json") ? res.json() : res.arrayBuffer()
  ) as Promise<T>;
}

export function docusign(): ESignProvider | null {
  const c = config();
  if (!c) return null;
  return {
    async createEnvelope({ pdf, documentName, subject, signer, cc = [], anchor, webhookUrl }) {
      const anchorTab = (xOffset: string) => ({
        anchorString: anchor,
        anchorUnits: "pixels",
        anchorXOffset: xOffset,
        anchorYOffset: "0",
        anchorIgnoreIfNotPresent: "false",
      });
      const body = await api<{ envelopeId: string }>(c, "/envelopes", {
        method: "POST",
        body: JSON.stringify({
          emailSubject: subject.slice(0, 100),
          status: "sent",
          documents: [
            {
              documentBase64: pdf.toString("base64"),
              name: documentName,
              fileExtension: "pdf",
              documentId: "1",
            },
          ],
          recipients: {
            signers: [
              {
                email: signer.email,
                name: signer.name,
                recipientId: "1",
                routingOrder: "1",
                clientUserId: signer.clientUserId,
                tabs: {
                  signHereTabs: [anchorTab("0")],
                  dateSignedTabs: [anchorTab("220")],
                },
              },
            ],
            // Copied after the signature: DocuSign e-mails them the signed document.
            carbonCopies: cc.map((r, i) => ({
              email: r.email,
              name: r.name,
              recipientId: String(i + 2),
              routingOrder: "2",
            })),
          },
          eventNotification: {
            url: webhookUrl,
            requireAcknowledgment: "true",
            includeHMAC: "true",
            loggingEnabled: "true",
            eventData: { version: "restv2.1", format: "json" },
            events: [
              "envelope-sent",
              "envelope-delivered",
              "envelope-completed",
              "envelope-declined",
              "envelope-voided",
            ],
          },
        }),
      });
      return { envelopeId: body.envelopeId };
    },

    async signingUrl({ envelopeId, signer, returnUrl, frameOrigin }) {
      const body = await api<{ url: string }>(c, `/envelopes/${envelopeId}/views/recipient`, {
        method: "POST",
        body: JSON.stringify({
          returnUrl,
          authenticationMethod: "none",
          email: signer.email,
          userName: signer.name,
          clientUserId: signer.clientUserId,
          // Lets the signing page run inside our modal.
          frameAncestors: [frameOrigin, appsOrigin(c)],
          messageOrigins: [appsOrigin(c)],
        }),
      });
      return body.url;
    },

    async status(envelopeId) {
      const body = await api<{ status?: string }>(c, `/envelopes/${envelopeId}`);
      return toSignatureStatus(body.status);
    },

    async signedPdf(envelopeId) {
      const bytes = await api<ArrayBuffer>(c, `/envelopes/${envelopeId}/documents/combined`, {
        headers: { Accept: "application/pdf" },
      });
      return Buffer.from(bytes);
    },

    verifyWebhook(rawBody, signatures) {
      const expected = Buffer.from(
        createHmac("sha256", c.webhookSecret).update(rawBody, "utf8").digest("base64"),
      );
      return signatures.some((s) => {
        const given = Buffer.from(s);
        return given.length === expected.length && timingSafeEqual(given, expected);
      });
    },
  };
}
