"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BellRing, BellOff } from "lucide-react";
import { removePushSubscription, savePushSubscription } from "@/app/app/notifications/actions";
import { Button, useToast } from "@/components/ui";
import { env } from "@/lib/env";
import styles from "./SmartInbox.module.css";

type State = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Turns web push on or off for this browser (reminders and urgent notifications). */
export function PushToggle() {
  const t = useTranslations("notificationsPage.push");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (!publicKey) {
      setState("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [publicKey]);

  const enable = () =>
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey!),
        });
        const r = await savePushSubscription(sub.toJSON(), navigator.userAgent);
        if (!r.ok) throw new Error(r.error);
        setState("on");
        toast(t("enabled"));
      } catch {
        toast(tAll("notificationsPage.push.failed"), "error");
      }
    });

  const disable = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast(t("disabled"));
    });

  if (state === "loading") return null;
  return (
    <div className={styles.push} data-testid="push-toggle" data-state={state}>
      {state === "on" ? (
        <Button variant="secondary" size="sm" loading={pending} onClick={disable}>
          <BellOff aria-hidden="true" />
          {t("disable")}
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={state !== "off"}
          onClick={enable}
        >
          <BellRing aria-hidden="true" />
          {t("enable")}
        </Button>
      )}
      {state !== "on" && state !== "off" ? (
        <span className={styles.pushNote}>{t(state)}</span>
      ) : null}
    </div>
  );
}
