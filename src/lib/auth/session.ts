import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { UserRow } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { hasRole, type Role } from "./roles";

export type Profile = Pick<
  UserRow,
  "id" | "email" | "role" | "display_name" | "phone" | "photo_url" | "locale" | "company_id"
>;

// password_hash is deliberately not granted to `authenticated`; never select "*".
const PROFILE_COLUMNS = "id, email, role, display_name, phone, photo_url, locale, company_id";

/** Verified Supabase Auth user id of the caller, or null. Cached per request. */
const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** The signed-in user's Pratonna profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const authUserId = await getAuthUserId();
  if (!authUserId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_users")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", authUserId)
    .eq("active", true)
    .maybeSingle();
  return data;
});

/**
 * Requires a signed-in user with a Pratonna profile. A Supabase account with
 * no profile (the Auth pool is shared with other apps) is signed out.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (profile) return profile;

  redirect((await getAuthUserId()) ? "/auth/signout?error=no-profile" : "/login");
}

/** Server-side RBAC: a page outside the user's roles behaves as if it did not exist. */
export async function requireRole(allowed: readonly Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!hasRole(profile.role, allowed)) notFound();
  return profile;
}
