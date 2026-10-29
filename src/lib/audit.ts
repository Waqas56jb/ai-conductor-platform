import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth/session";

/** Append-only trail of every mutation (who, what, on which entity). */
export async function audit(
  actor: Pick<Profile, "id" | "role" | "company_id">,
  action: string,
  entity: { type: string; id: string },
  data: Record<string, unknown> = {},
): Promise<void> {
  await createAdminClient().from("ai_conductor_audit_log").insert({
    company_id: actor.company_id,
    actor_id: actor.id,
    actor_role: actor.role,
    action,
    entity_type: entity.type,
    entity_id: entity.id,
    data,
  });
}
