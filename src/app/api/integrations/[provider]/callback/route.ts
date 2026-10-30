import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getProfile } from "@/lib/auth/session";
import { saveAccount } from "@/lib/email/accounts";
import { EMAIL_PROVIDERS, MAIL_PROVIDERS, OAUTH_COOKIE, redirectUri } from "@/lib/email/providers";

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * The provider sends the user back here. The state must match the cookie set
 * by /connect for this provider and this user; then the code is exchanged and
 * the tokens stored encrypted. Nothing is read from the mailbox here.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await params;
  const url = request.nextUrl;
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/app/settings/integrations?${query}`, request.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/integrations" });
    return res;
  };

  const profile = await getProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", request.url));
  if (!(EMAIL_PROVIDERS as readonly string[]).includes(id)) return back("error=unknown");
  const provider = MAIL_PROVIDERS[id as (typeof EMAIL_PROVIDERS)[number]];
  if (!provider.configured()) return back("error=notConfigured");
  if (url.searchParams.get("error")) return back("error=denied");

  const [cookieProvider, nonce, userId] = (request.cookies.get(OAUTH_COOKIE)?.value ?? "").split(
    ".",
  );
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (
    cookieProvider !== provider.id ||
    userId !== profile.id ||
    !nonce ||
    !code ||
    !same(nonce, state)
  )
    return back("error=state");

  try {
    const tokens = await provider.exchange(code, redirectUri(provider.id));
    const email = await provider.accountEmail(tokens.accessToken);
    const accountId = await saveAccount(profile, provider.id, email, tokens);
    await audit(
      profile,
      "integration.connected",
      { type: "integration", id: accountId },
      {
        provider: provider.id,
        scopes: tokens.scopes,
      },
    );
    return back(`connected=${provider.id}`);
  } catch (e) {
    console.error("[email] OAuth callback failed", e);
    return back("error=failed");
  }
}
