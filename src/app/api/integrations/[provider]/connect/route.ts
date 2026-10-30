import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { EMAIL_PROVIDERS, MAIL_PROVIDERS, OAUTH_COOKIE, redirectUri } from "@/lib/email/providers";

/**
 * Starts the OAuth flow: a one-time state (httpOnly cookie, ten minutes) ties
 * the provider's answer to this browser and this user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await params;
  const back = (query: string) =>
    NextResponse.redirect(new URL(`/app/settings/integrations?${query}`, request.url));
  const profile = await getProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", request.url));
  if (!(EMAIL_PROVIDERS as readonly string[]).includes(id) || profile.role === "client")
    return back("error=unknown");
  const provider = MAIL_PROVIDERS[id as (typeof EMAIL_PROVIDERS)[number]];
  if (!provider.configured()) return back("error=notConfigured");

  const nonce = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(provider.authUrl(nonce, redirectUri(provider.id)));
  response.cookies.set(OAUTH_COOKIE, `${provider.id}.${nonce}.${profile.id}`, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations",
    maxAge: 600,
  });
  return response;
}
