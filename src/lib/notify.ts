import "server-only";
import type { Role } from "@/lib/auth/roles";
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
};

/** In-app notifications (delivered live through Supabase Realtime). */
export async function notify(n: Notice): Promise<void> {
  const ids = [...new Set(n.userIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  await createAdminClient()
    .from("ai_conductor_notifications")
    .insert(
      ids.map((user_id) => ({
        company_id: n.companyId,
        user_id,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        incident_id: n.incidentId ?? null,
        quotation_id: n.quotationId ?? null,
        invoice_id: n.invoiceId ?? null,
      })),
    );
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
