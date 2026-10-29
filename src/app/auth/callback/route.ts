import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

/** Email links (confirmation, password reset) land here with a PKCE code. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
