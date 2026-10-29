import "server-only";
import { audit } from "@/lib/audit";
import type { Profile } from "@/lib/auth/session";
import type { IncidentRow } from "@/lib/db/types";
import { usersWithRoles } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  nextStatus,
  type IncidentAction,
  type IncidentStatus,
  type TransitionContext,
} from "@/lib/workflows/incident";

export const OFFICE_ROLES = ["manager", "director", "admin"] as const;

/** Profile ids of the company's office (managers, directors, admins). */
export const office = (companyId: string) => usersWithRoles(companyId, OFFICE_ROLES);

/**
 * Applies a state-machine transition. The update is guarded on the current
 * status, so two people (or a person and a webhook) acting at once cannot both
 * succeed. Callers prove the actor may see the case before calling this.
 */
export async function transition(
  profile: Profile,
  incident: IncidentRow,
  action: IncidentAction,
  ctx: TransitionContext,
  patch: Partial<IncidentRow> = {},
): Promise<{ ok: true; status: IncidentStatus } | { ok: false; error: string }> {
  const result = nextStatus(incident.status, action, ctx);
  if (!result.ok) {
    console.warn(
      `transition refused: ${action} from ${incident.status} (${ctx.role}): ${result.reason}`,
    );
    return { ok: false, error: `cases.errors.${result.reason}` };
  }

  const { data } = await createAdminClient()
    .from("ai_conductor_incidents")
    .update({
      ...patch,
      status: result.status,
      ...(result.status === "closed" ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq("id", incident.id)
    .eq("status", incident.status)
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, error: "cases.errors.conflict" };

  await audit(
    profile,
    `incident.${action}`,
    { type: "incident", id: incident.id },
    { from: incident.status, to: result.status },
  );
  return { ok: true, status: result.status };
}
