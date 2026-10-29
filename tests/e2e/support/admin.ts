import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Role } from "../../../src/lib/auth/roles";

export const E2E_COMPANY = "E2E Pratonna (tests automatiques)";
export const E2E_PASSWORD = "E2e-Pratonna-2026";
/** Reserved test domain: no email is ever delivered. */
export const e2eEmail = (name: string) => `e2e-${name}@pratonna-e2e.test`;

export type E2EState = {
  companyId: string;
  users: Record<Role, { authId: string; profileId: string; email: string; name: string }>;
  /** Supabase account with no Pratonna profile (another app sharing the Auth pool). */
  orphan: { authId: string; email: string };
  /** Dedicated account for the password-recovery test (its password changes). */
  recovery: { authId: string; profileId: string; email: string };
  /** Second client / technician: must never see the first one's cases. */
  client2: { authId: string; profileId: string; email: string; name: string };
  technician2: { authId: string; profileId: string; email: string; name: string };
};

const STATE_FILE = join(__dirname, "..", ".state.json");

export function saveState(state: E2EState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function readState(): E2EState {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing for e2e");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Test accounts: the reserved test domain, or e2e-*@example.com (sign-up test). */
export const isE2EEmail = (email: string) =>
  email.endsWith("@pratonna-e2e.test") || /^e2e-[\w.-]+@example\.com$/.test(email);

async function allAuthUsers() {
  const admin = adminClient();
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  return users;
}

export async function findAuthUserId(email: string): Promise<string | null> {
  return (await allAuthUsers()).find((u) => u.email === email)?.id ?? null;
}

/** Deletes every auth user with an e2e test email. */
export async function deleteE2EAuthUsers() {
  const admin = adminClient();
  for (const user of await allAuthUsers()) {
    if (user.email && isE2EEmail(user.email)) await admin.auth.admin.deleteUser(user.id);
  }
}

/** Deletes e2e companies (cascades to profiles and every business row). */
export async function deleteE2ECompanies() {
  const admin = adminClient();
  const { data: users } = await admin
    .from("ai_conductor_users")
    .select("company_id")
    .or("email.like.%@pratonna-e2e.test,email.like.e2e-%@example.com");
  const ids = new Set((users ?? []).map((u) => u.company_id as string));
  const { data: named } = await admin
    .from("ai_conductor_companies")
    .select("id")
    .eq("name", E2E_COMPANY);
  for (const c of named ?? []) ids.add(c.id as string);
  if (ids.size)
    await admin
      .from("ai_conductor_companies")
      .delete()
      .in("id", [...ids]);
}
