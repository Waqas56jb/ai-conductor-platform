import "server-only";
import { env } from "@/lib/env";

/**
 * Gmail and Outlook (Microsoft Graph) behind one interface: OAuth 2.0
 * authorization code flow (offline access), the inbox, one message, send.
 */

export const EMAIL_PROVIDERS = ["google", "microsoft"] as const;
export type EmailProviderId = (typeof EMAIL_PROVIDERS)[number];

export type Tokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
};

export type MailSummary = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
};

export type MailMessage = MailSummary & { to: string; body: string; messageId: string | null };

export type OutgoingMail = {
  to: string;
  subject: string;
  body: string;
  /** Reply in this conversation. */
  replyTo?: { id: string; threadId: string; messageId: string | null } | null;
};

export interface MailProvider {
  id: EmailProviderId;
  configured(): boolean;
  authUrl(state: string, redirectUri: string): string;
  exchange(code: string, redirectUri: string): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
  accountEmail(accessToken: string): Promise<string>;
  inbox(accessToken: string, limit: number): Promise<MailSummary[]>;
  message(accessToken: string, id: string): Promise<MailMessage>;
  send(accessToken: string, mail: OutgoingMail): Promise<void>;
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${what} failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

const toTokens = (t: TokenResponse, previousRefresh: string | null = null): Tokens => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? previousRefresh,
  expiresAt: new Date(Date.now() + (t.expires_in - 60) * 1000),
  scopes: (t.scope ?? "").split(/\s+/).filter(Boolean),
});

const form = (params: Record<string, string>) => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(params),
});

// ---------- Gmail ----------

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPart;
};

const header = (m: GmailMessage, name: string) =>
  m.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

/** The first text/plain part, decoded (Gmail uses base64url). */
function gmailText(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return Buffer.from(part.body.data, "base64url").toString("utf8");
  for (const p of part.parts ?? []) {
    const text = gmailText(p);
    if (text) return text;
  }
  return "";
}

const gmailSummary = (m: GmailMessage): MailSummary => ({
  id: m.id,
  threadId: m.threadId,
  from: header(m, "From"),
  subject: header(m, "Subject"),
  snippet: m.snippet ?? "",
  date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : "",
  unread: m.labelIds?.includes("UNREAD") ?? false,
});

/** RFC 2047 for non-ASCII subjects. */
const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;

const google: MailProvider = {
  id: "google",
  configured: () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  authUrl: (state, redirectUri) =>
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    })}`,
  async exchange(code, redirectUri) {
    const res = await fetch(
      "https://oauth2.googleapis.com/token",
      form({
        code,
        client_id: env.GOOGLE_CLIENT_ID ?? "",
        client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    );
    return toTokens(await json<TokenResponse>(res, "Google token"));
  },
  async refresh(refreshToken) {
    const res = await fetch(
      "https://oauth2.googleapis.com/token",
      form({
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID ?? "",
        client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
      }),
    );
    return toTokens(await json<TokenResponse>(res, "Google refresh"), refreshToken);
  },
  async accountEmail(accessToken) {
    const res = await fetch(`${GMAIL}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (await json<{ emailAddress: string }>(res, "Gmail profile")).emailAddress;
  },
  async inbox(accessToken, limit) {
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    const list = await json<{ messages?: { id: string }[] }>(
      await fetch(`${GMAIL}/messages?maxResults=${limit}&labelIds=INBOX`, auth),
      "Gmail list",
    );
    const metadata = "format=metadata&metadataHeaders=From&metadataHeaders=Subject";
    const messages = await Promise.all(
      (list.messages ?? []).map(async ({ id }) =>
        json<GmailMessage>(
          await fetch(`${GMAIL}/messages/${id}?${metadata}`, auth),
          "Gmail message",
        ),
      ),
    );
    return messages.map(gmailSummary);
  },
  async message(accessToken, id) {
    const m = await json<GmailMessage>(
      await fetch(`${GMAIL}/messages/${encodeURIComponent(id)}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      "Gmail message",
    );
    return {
      ...gmailSummary(m),
      to: header(m, "To"),
      body: gmailText(m.payload) || m.snippet || "",
      messageId: header(m, "Message-ID") || null,
    };
  },
  async send(accessToken, mail) {
    const lines = [
      `To: ${mail.to}`,
      `Subject: ${encodeHeader(mail.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      ...(mail.replyTo?.messageId
        ? [`In-Reply-To: ${mail.replyTo.messageId}`, `References: ${mail.replyTo.messageId}`]
        : []),
      "",
      mail.body,
    ];
    const res = await fetch(`${GMAIL}/messages/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: Buffer.from(lines.join("\r\n"), "utf8").toString("base64url"),
        ...(mail.replyTo ? { threadId: mail.replyTo.threadId } : {}),
      }),
    });
    await json(res, "Gmail send");
  },
};

// ---------- Outlook (Microsoft Graph) ----------

const MS_SCOPES = ["offline_access", "openid", "email", "User.Read", "Mail.Read", "Mail.Send"];
const GRAPH = "https://graph.microsoft.com/v1.0/me";
const msAuthority = () => `https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0`;

type GraphMessage = {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  isRead?: boolean;
  internetMessageId?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  body?: { content?: string };
};

const graphAddress = (a?: { name?: string; address?: string }) =>
  a ? (a.name ? `${a.name} <${a.address}>` : (a.address ?? "")) : "";

const graphSummary = (m: GraphMessage): MailSummary => ({
  id: m.id,
  threadId: m.conversationId,
  from: graphAddress(m.from?.emailAddress),
  subject: m.subject ?? "",
  snippet: m.bodyPreview ?? "",
  date: m.receivedDateTime ?? "",
  unread: m.isRead === false,
});

const microsoft: MailProvider = {
  id: "microsoft",
  configured: () => Boolean(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET),
  authUrl: (state, redirectUri) =>
    `${msAuthority()}/authorize?${new URLSearchParams({
      client_id: env.MS_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      response_mode: "query",
      scope: MS_SCOPES.join(" "),
      prompt: "select_account",
      state,
    })}`,
  async exchange(code, redirectUri) {
    const res = await fetch(
      `${msAuthority()}/token`,
      form({
        code,
        client_id: env.MS_CLIENT_ID ?? "",
        client_secret: env.MS_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: MS_SCOPES.join(" "),
      }),
    );
    return toTokens(await json<TokenResponse>(res, "Microsoft token"));
  },
  async refresh(refreshToken) {
    const res = await fetch(
      `${msAuthority()}/token`,
      form({
        refresh_token: refreshToken,
        client_id: env.MS_CLIENT_ID ?? "",
        client_secret: env.MS_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        scope: MS_SCOPES.join(" "),
      }),
    );
    return toTokens(await json<TokenResponse>(res, "Microsoft refresh"), refreshToken);
  },
  async accountEmail(accessToken) {
    const me = await json<{ mail?: string; userPrincipalName?: string }>(
      await fetch(GRAPH, { headers: { Authorization: `Bearer ${accessToken}` } }),
      "Graph profile",
    );
    return me.mail || me.userPrincipalName || "";
  },
  async inbox(accessToken, limit) {
    const select = "id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from";
    const res = await fetch(
      `${GRAPH}/mailFolders/inbox/messages?$top=${limit}&$select=${select}&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return (await json<{ value: GraphMessage[] }>(res, "Graph inbox")).value.map(graphSummary);
  },
  async message(accessToken, id) {
    const m = await json<GraphMessage>(
      await fetch(`${GRAPH}/messages/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.body-content-type="text"',
        },
      }),
      "Graph message",
    );
    return {
      ...graphSummary(m),
      to: (m.toRecipients ?? [])
        .map((r) => r.emailAddress?.address)
        .filter(Boolean)
        .join(", "),
      body: m.body?.content ?? m.bodyPreview ?? "",
      messageId: m.internetMessageId ?? null,
    };
  },
  async send(accessToken, mail) {
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const res = mail.replyTo
      ? await fetch(`${GRAPH}/messages/${encodeURIComponent(mail.replyTo.id)}/reply`, {
          method: "POST",
          headers,
          body: JSON.stringify({ comment: mail.body }),
        })
      : await fetch(`${GRAPH}/sendMail`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: {
              subject: mail.subject,
              body: { contentType: "Text", content: mail.body },
              toRecipients: [{ emailAddress: { address: mail.to } }],
            },
            saveToSentItems: true,
          }),
        });
    if (!res.ok)
      throw new Error(`Graph send failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  },
};

export const MAIL_PROVIDERS: Record<EmailProviderId, MailProvider> = { google, microsoft };

/** One-time OAuth state: "<provider>.<nonce>.<profile id>", httpOnly, ten minutes. */
export const OAUTH_COOKIE = "pratonna_oauth";

/** Where each provider sends the user back: register these exact URLs. */
export const redirectUri = (provider: EmailProviderId) =>
  `${env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/callback`;
