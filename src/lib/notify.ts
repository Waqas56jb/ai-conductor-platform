import "server-only";
import type { Role } from "@/lib/auth/roles";
import {
  classify,
  ruleConditionSchema,
  type Priority,
  type Rule,
  type Source,
} from "@/lib/notifications/priority";
import { pushTo } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

type Notice = {
  companyId: string;
  userIds: readonly (string | null | undefined)[];
  type: string;
  title: string;
  body?: string;
  incidentId?: string;
  quotationId?: string;
  invoiceId?: string;
  source?: Source;
  /** Forces the priority (e.g. a due reminder); otherwise each user's rules decide. */
  priority?: Priority;
  /** Where a click on the push notification leads (urgent ones are pushed). */
  push?: { url?: string; tag?: string };
};

/** Approved priority rules of these users, by user. */
async function rulesOf(userIds: readonly string[]): Promise<Map<string, Rule[]>> {
  const { data } = await createAdminClient()
    .from("ai_conductor_priority_rules")
    .select("user_id, condition, priority")
    .in("user_id", [...userIds])
    .eq("approved", true);
  const out = new Map<string, Rule[]>();
  for (const r of data ?? []) {
    const condition = ruleConditionSchema.safeParse(r.condition);
    if (!condition.success) continue;
    out.set(r.user_id, [
      ...(out.get(r.user_id) ?? []),
      { condition: condition.data, priority: r.priority },
    ]);
  }
  return out;
}

/**
 * In-app notifications (delivered live through Supabase Realtime), sorted
 * into the smart inbox per user; urgent ones also go out as web push.
 */
export async function notify(n: Notice): Promise<void> {
  const ids = [...new Set(n.userIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  const source = n.source ?? "system";
  const rules = n.priority ? new Map<string, Rule[]>() : await rulesOf(ids);
  const rows = ids.map((user_id) => ({
    company_id: n.companyId,
    user_id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    incident_id: n.incidentId ?? null,
    quotation_id: n.quotationId ?? null,
    invoice_id: n.invoiceId ?? null,
    source,
    priority:
      n.priority ??
      classify({ type: n.type, source, title: n.title, body: n.body }, rules.get(user_id) ?? []),
  }));
  await createAdminClient().from("ai_conductor_notifications").insert(rows);

  const urgent = rows.filter((r) => r.priority === "urgent").map((r) => r.user_id);
  if (urgent.length) {
    await pushTo(urgent, {
      title: n.title,
      body: n.body,
      url: n.push?.url ?? (n.incidentId ? `/app/cases/${n.incidentId}` : "/app/notifications"),
      tag: n.push?.tag,
    });
  }
}

/** Profile ids of the company's users with the given roles. */
export async function usersWithRoles(companyId: string, roles: readonly Role[]): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("ai_conductor_users")
    .select("id")
    .eq("company_id", companyId)
    .eq("active", true)
    .in("role", [...roles]);
  return (data ?? []).map((u) => u.id);
}
