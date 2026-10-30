import "server-only";
import type { Profile } from "@/lib/auth/session";
import { decrypt, encrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_PROVIDERS, type EmailProviderId, type MailProvider, type Tokens } from "./providers";

/** What the UI may know about a connected mailbox (never the tokens). */
export type EmailAccount = {
  id: string;
  provider: EmailProviderId;
  email: string;
  status: "connected" | "expired" | "revoked" | "error";
  connectedAt: string;
};

const PUBLIC_COLUMNS = "id, provider, account_email, status, created_at";

/** The user's own mailboxes. Server-only: the table is never readable from the browser. */
export async function emailAccounts(userId: string): Promise<EmailAccount[]> {
  const { data } = await createAdminClient()
    .from("ai_conductor_integrations")
    .select(PUBLIC_COLUMNS)
    .eq("user_id", userId)
    .in("provider", ["google", "microsoft"])
    .order("created_at");
  return (data ?? []).map((a) => ({
    id: a.id,
    provider: a.provider as EmailProviderId,
    email: a.account_email,
    status: a.status,
    connectedAt: a.created_at,
  }));
}

export async function saveAccount(
  profile: Profile,
  provider: EmailProviderId,
  email: string,
  tokens: Tokens,
): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("ai_conductor_integrations")
    .upsert(
      {
        company_id: profile.company_id,
        user_id: profile.id,
        provider,
        account_email: email,
        status: "connected",
        scopes: tokens.scopes,
        access_token_enc: encrypt(tokens.accessToken),
        refresh_token_enc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expires_at: tokens.expiresAt.toISOString(),
      },
      { onConflict: "user_id,provider,account_email" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`mailbox not saved: ${error?.message}`);
  return data.id;
}

/**
 * A mailbox of this user with a valid access token, refreshed (and stored
 * again) when expired. A refused refresh marks the mailbox as expired.
 */
export async function openMailbox(
  userId: string,
  accountId: string,
): Promise<{ account: EmailAccount; provider: MailProvider; accessToken: string } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("ai_conductor_integrations")
    .select(`${PUBLIC_COLUMNS}, access_token_enc, refresh_token_enc, expires_at`)
    .eq("id", accountId)
    .eq("user_id", userId)
    .in("provider", ["google", "microsoft"])
    .maybeSingle();
  if (!row || !row.access_token_enc || row.status === "revoked") return null;
  const provider = MAIL_PROVIDERS[row.provider as EmailProviderId];
  if (!provider.configured()) return null;
  const account: EmailAccount = {
    id: row.id,
    provider: provider.id,
    email: row.account_email,
    status: row.status,
    connectedAt: row.created_at,
  };

  let accessToken = decrypt(row.access_token_enc);
  if (!row.expires_at || new Date(row.expires_at) <= new Date()) {
    if (!row.refresh_token_enc) return null;
    try {
      const tokens = await provider.refresh(decrypt(row.refresh_token_enc));
      accessToken = tokens.accessToken;
      await admin
        .from("ai_conductor_integrations")
        .update({
          access_token_enc: encrypt(tokens.accessToken),
          refresh_token_enc: tokens.refreshToken
            ? encrypt(tokens.refreshToken)
            : row.refresh_token_enc,
          expires_at: tokens.expiresAt.toISOString(),
          status: "connected",
        })
        .eq("id", row.id);
    } catch (e) {
      console.error("[email] refresh refused", e);
      await admin.from("ai_conductor_integrations").update({ status: "expired" }).eq("id", row.id);
      return null;
    }
  }
  return { account, provider, accessToken };
}

export async function removeAccount(userId: string, accountId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("ai_conductor_integrations")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId)
    .select("id");
  return Boolean(data?.length);
}
