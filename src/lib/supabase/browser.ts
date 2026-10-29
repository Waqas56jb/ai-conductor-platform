import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser client (session from the auth cookies). Used for Realtime only. */
export function browserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  return client;
}
