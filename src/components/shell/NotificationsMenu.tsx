"use client";

import { useTransition } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { markAllNotificationsRead } from "@/app/app/actions";
import { EmptyState } from "@/components/ui";
import type { ShellNotification } from "./types";
import { usePopover } from "./usePopover";
import styles from "./shell.module.css";

export function NotificationsMenu({
  notifications,
  unreadCount,
}: {
  notifications: ShellNotification[];
  unreadCount: number;
}) {
  const t = useTranslations("shell");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { open, setOpen, rootRef, triggerRef } = usePopover();
  const [pending, startTransition] = useTransition();

  return (
    <div className={styles.popoverRoot} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.iconButton}
        aria-label={`${t("notifications")} — ${t("unread", { count: unreadCount })}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell aria-hidden="true" />
        {unreadCount ? (
          <span className={styles.dot} data-testid="unread-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`${styles.popover} ${styles.popoverWide}`}
          role="region"
          aria-label={t("notifications")}
        >
          <div className={styles.popoverHead}>
            <strong>{t("notifications")}</strong>
            {unreadCount ? (
              <button
                type="button"
                className={styles.textButton}
                disabled={pending}
                onClick={() => startTransition(() => markAllNotificationsRead())}
              >
                {t("markAllRead")}
              </button>
            ) : null}
          </div>
          {notifications.length ? (
            <ul className={styles.notifList}>
              {notifications.map((n) => (
                <li key={n.id} className={n.read ? undefined : styles.notifUnread}>
                  <p className={styles.notifTitle}>{n.title}</p>
                  {n.body ? <p className={styles.notifBody}>{n.body}</p> : null}
                  <time className={styles.notifTime} dateTime={n.createdAt}>
                    {format.relativeTime(new Date(n.createdAt), now)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<BellOff />} title={t("noNotifications")} />
          )}
        </div>
      ) : null}
    </div>
  );
}
