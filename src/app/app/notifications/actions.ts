"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import {
  classify,
  PRIORITIES,
  ruleConditionSchema,
  suggestFromOverrides,
  type Priority,
  type Rule,
} from "@/lib/notifications/priority";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };
const notFound: Result = { ok: false, error: "notificationsPage.errors.notFound" };

/** Recent manual moves looked at when inferring a rule. */
const OVERRIDE_WINDOW = 50;

const TYPE_LABEL: Record<string, string> = {
  quotation: "devis",
  invoice: "factures",
  intervention: "interventions",
  incident: "dossiers",
  assignment: "affectations",
  reminder: "rappels",
  message: "messages",
};
const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "urgentes",
  important: "importantes",
  digest: "dans le résumé",
};

/** Moves one of the user's notifications to another tab; rules never move it back. */
export async function setNotificationPriority(id: string, priority: string): Promise<Result> {
  const profile = await requireProfile();
  const p = z.enum(PRIORITIES).safeParse(priority);
  if (!z.uuid().safeParse(id).success || !p.success) return notFound;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_conductor_notifications")
    .update({ priority: p.data, priority_overridden: true })
    .eq("id", id)
    .eq("user_id", profile.id)
    .select("id");
  if (!data?.length) return notFound;
  await audit(
    profile,
    "notification.priority_overridden",
    { type: "notification", id },
    { priority: p.data },
  );

  // Moved the same kind by hand twice? Suggest a rule (never applied unasked).
  const { data: overrides } = await admin
    .from("ai_conductor_notifications")
    .select("type, priority")
    .eq("user_id", profile.id)
    .eq("priority_overridden", true)
    .order("created_at", { ascending: false })
    .limit(OVERRIDE_WINDOW);
  const rule = suggestFromOverrides(
    (overrides ?? []).flatMap((o) => (o.type ? [{ type: o.type, priority: o.priority }] : [])),
  );
  if (rule?.condition.type) {
    const { data: existing } = await admin
      .from("ai_conductor_priority_rules")
      .select("id")
      .eq("user_id", profile.id)
      .contains("condition", { type: rule.condition.type })
      .limit(1);
    if (!existing?.length) {
      await admin.from("ai_conductor_priority_rules").insert({
        user_id: profile.id,
        company_id: profile.company_id,
        condition: rule.condition,
        priority: rule.priority,
        label: `Toujours classer les ${TYPE_LABEL[rule.condition.type] ?? `notifications « ${rule.condition.type} »`} ${PRIORITY_LABEL[rule.priority]} ?`,
        approved: false,
        source: "overrides",
      });
    }
  }
  revalidatePath("/app/notifications");
  return { ok: true };
}

/**
 * Accepts or refuses a suggested rule. Nothing is applied before acceptance;
 * once accepted, it also re-sorts the user's notifications not moved by hand.
 */
export async function decideRule(id: string, accept: boolean): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return notFound;
  const admin = createAdminClient();
  const { data: rule } = await admin
    .from("ai_conductor_priority_rules")
    .select("id, condition, priority, approved")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!rule || rule.approved) return notFound;

  if (!accept) {
    await admin.from("ai_conductor_priority_rules").delete().eq("id", id).eq("user_id", profile.id);
    await audit(profile, "notification.rule_refused", { type: "priority_rule", id });
    revalidatePath("/app/notifications");
    return { ok: true };
  }

  const condition = ruleConditionSchema.safeParse(rule.condition);
  if (!condition.success) return notFound;
  await admin.from("ai_conductor_priority_rules").update({ approved: true }).eq("id", id);
  await audit(
    profile,
    "notification.rule_accepted",
    { type: "priority_rule", id },
    {
      condition: condition.data,
      priority: rule.priority,
    },
  );

  const { data: rules } = await admin
    .from("ai_conductor_priority_rules")
    .select("condition, priority")
    .eq("user_id", profile.id)
    .eq("approved", true);
  const approved: Rule[] = (rules ?? []).flatMap((r) => {
    const c = ruleConditionSchema.safeParse(r.condition);
    return c.success ? [{ condition: c.data, priority: r.priority }] : [];
  });
  const { data: items } = await admin
    .from("ai_conductor_notifications")
    .select("id, type, source, title, body, priority")
    .eq("user_id", profile.id)
    .eq("priority_overridden", false)
    .order("created_at", { ascending: false })
    .limit(200);
  for (const n of items ?? []) {
    const next = classify(
      { type: n.type ?? "", source: n.source, title: n.title, body: n.body },
      approved,
    );
    if (next !== n.priority)
      await admin.from("ai_conductor_notifications").update({ priority: next }).eq("id", n.id);
  }
  revalidatePath("/app/notifications");
  return { ok: true };
}

/** Removes an accepted rule (confirmed in the UI). */
export async function deleteRule(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return notFound;
  const { data } = await createAdminClient()
    .from("ai_conductor_priority_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id)
    .select("id");
  if (!data?.length) return notFound;
  await audit(profile, "notification.rule_deleted", { type: "priority_rule", id });
  revalidatePath("/app/notifications");
  return { ok: true };
}

// ---------- web push ----------

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Stores this browser's push subscription for the signed-in user. */
export async function savePushSubscription(
  subscription: unknown,
  userAgent: string,
): Promise<Result> {
  const profile = await requireProfile();
  const sub = subscriptionSchema.safeParse(subscription);
  if (!sub.success) return { ok: false, error: "notificationsPage.push.failed" };
  const { error } = await createAdminClient()
    .from("ai_conductor_push_subscriptions")
    .upsert(
      {
        company_id: profile.company_id,
        user_id: profile.id,
        endpoint: sub.data.endpoint,
        p256dh: sub.data.keys.p256dh,
        auth: sub.data.keys.auth,
        user_agent: userAgent.slice(0, 300),
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: "notificationsPage.push.failed" };
  await audit(profile, "push.subscribed", { type: "user", id: profile.id });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const profile = await requireProfile();
  await createAdminClient()
    .from("ai_conductor_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", profile.id);
  await audit(profile, "push.unsubscribed", { type: "user", id: profile.id });
  return { ok: true };
}
