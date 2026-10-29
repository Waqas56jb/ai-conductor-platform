import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { env } from "@/lib/env";

/**
 * Service-role client: bypasses RLS. Only for operations the user cannot do
 * themselves (creating a company at sign-up, role changes), always after an
 * explicit server-side permission check.
 */
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
