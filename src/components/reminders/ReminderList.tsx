"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { cancelReminder, completeReminder } from "@/app/app/reminders/actions";
import { Badge, Button, EmptyState, Modal, useToast, type BadgeTone } from "@/components/ui";
import type { ReminderKind } from "@/lib/reminders";
import styles from "./reminders.module.css";

export type ReminderItem = {
  id: string;
  kind: ReminderKind;
  title: string;
  notes: string;
  dueAt: string;
  status: "scheduled" | "sent" | "done" | "cancelled" | "failed";
  href: string | null;
};

const TONE: Record<ReminderItem["status"], BadgeTone> = {
  scheduled: "info",
  sent: "warning",
  done: "success",
  cancelled: "neutral",
  failed: "danger",
};

export function ReminderList({ items, empty }: { items: ReminderItem[]; empty: string }) {
  const t = useTranslations("reminders");
  const tAll = useTranslations();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState<ReminderItem | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startTransition(async () => {
      const r = await action();
      if (r.ok) toast(done);
      else toast(tAll(r.error ?? "common.error"), "error");
      setCancelling(null);
      router.refresh();
    });

  if (!items.length) return <EmptyState title={empty} />;

  return (
    <>
      <ul className={styles.list}>
        {items.map((r) => (
          <li key={r.id} data-testid="reminder">
            <div className={styles.main}>
              <div className={styles.meta}>
                <Badge tone="neutral">{t(`kinds.${r.kind}`)}</Badge>
                <Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
                <time dateTime={r.dueAt}>
                  {format.dateTime(new Date(r.dueAt), { dateStyle: "medium", timeStyle: "short" })}
                </time>
              </div>
              <strong>{r.href ? <Link href={r.href}>{r.title}</Link> : r.title}</strong>
              {r.notes ? <span className={styles.notes}>{r.notes}</span> : null}
            </div>
            {r.status === "scheduled" || r.status === "sent" ? (
              <div className={styles.actions}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => completeReminder(r.id), t("doneToast"))}
                >
                  <Check aria-hidden="true" />
                  {t("done")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setCancelling(r)}
                  aria-label={`${t("cancel")} : ${r.title}`}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={t("cancelTitle")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => cancelling && run(() => cancelReminder(cancelling.id), t("cancelled"))}
            >
              {t("cancel")}
            </Button>
          </>
        }
      >
        {cancelling ? t("cancelConfirm", { title: cancelling.title }) : null}
      </Modal>
    </>
  );
}
