import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest, reason: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(`/login?${reason}`, request.nextUrl.origin), {
    status: 303,
  });
}

/** Normal sign-out (form POST from the user menu). */
export async function POST(request: NextRequest) {
  return signOut(request, "signedout=1");
}

/**
 * Only used by requireProfile() for a Supabase account without a Pratonna
 * profile (shared Auth pool): end that session and explain why.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("error") !== "no-profile") {
    return NextResponse.redirect(new URL("/app", request.nextUrl.origin));
  }
  return signOut(request, "error=no-profile");
}
