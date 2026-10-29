import "server-only";
import webpush from "web-push";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

let configured: boolean | null = null;

/** Web push needs a VAPID key pair; without it, notifications stay in-app. */
export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  configured = Boolean(publicKey && privateKey);
  if (configured) webpush.setVapidDetails(env.VAPID_SUBJECT, publicKey!, privateKey!);
  return configured;
}

/**
 * Sends to every browser the users subscribed. Subscriptions the push service
 * says are gone (404 / 410) are deleted. Never throws: push is best effort.
 */
export async function pushTo(userIds: readonly string[], payload: PushPayload): Promise<number> {
  if (!userIds.length || !pushConfigured()) return 0;
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("ai_conductor_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", [...userIds]);
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error("[push] send failed", status ?? e);
      }
    }),
  );
  if (gone.length) await admin.from("ai_conductor_push_subscriptions").delete().in("id", gone);
  return sent;
}
