"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { BellOff, Check, Sparkles, Trash2, X } from "lucide-react";
import { decideRule, deleteRule, setNotificationPriority } from "@/app/app/notifications/actions";
import { Badge, Button, EmptyState, Modal, Tabs, useToast } from "@/components/ui";
import { PRIORITIES, type Priority, type Source } from "@/lib/notifications/priority";
import styles from "./SmartInbox.module.css";

export type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  href: string | null;
  createdAt: string;
  priority: Priority;
  source: Source;
};

export type InboxRule = { id: string; label: string; approved: boolean };

type Result = { ok: true } | { ok: false; error: string };

export function SmartInbox({
  items,
  rules,
  now: nowIso,
}: {
  items: InboxItem[];
  rules: InboxRule[];
  /** Server time: relative dates render the same on server and client. */
  now: string;
}) {
  const t = useTranslations("notificationsPage");
  const tAll = useTranslations();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<InboxRule | null>(null);
  const now = new Date(nowIso);

  const run = (action: () => Promise<Result>, done: string) =>
    startTransition(async () => {
      const r = await action();
      if (r.ok) toast(done);
      else toast(tAll(r.error), "error");
      setRemoving(null);
      router.refresh();
    });

  const suggestions = rules.filter((r) => !r.approved);
  const active = rules.filter((r) => r.approved);

  const row = (n: InboxItem) => (
    <li key={n.id} className={n.read ? "" : styles.unread} data-testid="inbox-item">
      <div className={styles.text}>
        <span className={styles.meta}>
          <Badge tone="neutral">{t(`source.${n.source}`)}</Badge>
          <time dateTime={n.createdAt}>{format.relativeTime(new Date(n.createdAt), now)}</time>
        </span>
        <strong>{n.title}</strong>
        {n.body ? <span className={styles.body}>{n.body}</span> : null}
        {n.href ? <Link href={n.href}>{t("open")}</Link> : null}
      </div>
      <label className={styles.move}>
        <span className="sr-only">{t("moveLabel", { title: n.title })}</span>
        <select
          value={n.priority}
          disabled={pending}
          onChange={(e) => run(() => setNotificationPriority(n.id, e.target.value), t("moved"))}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`tabs.${p}`)}
            </option>
          ))}
        </select>
      </label>
    </li>
  );

  const list = (priority: Priority) => {
    const mine = items.filter((n) => n.priority === priority);
    if (!mine.length) return <EmptyState icon={<BellOff />} title={t(`empty.${priority}`)} />;
    if (priority !== "digest") return <ul className={styles.list}>{mine.map(row)}</ul>;

    // Digest: today's low-priority items grouped by kind, then older ones.
    const today = mine.filter((n) => new Date(n.createdAt).toDateString() === now.toDateString());
    const older = mine.filter((n) => !today.includes(n));
    const groups = new Map<string, InboxItem[]>();
    for (const n of today) groups.set(n.type, [...(groups.get(n.type) ?? []), n]);
    return (
      <div className="stack">
        {today.length ? (
          <section aria-label={t("digestToday")}>
            <h3 className={styles.groupTitle}>{t("digestToday")}</h3>
            {[...groups].map(([type, group]) => (
              <details key={type} className={styles.group} open={groups.size === 1}>
                <summary>
                  {t("digestGroup", {
                    count: group.length,
                    kind: t.has(`kinds.${type}`) ? t(`kinds.${type}`) : type,
                  })}
                </summary>
                <ul className={styles.list}>{group.map(row)}</ul>
              </details>
            ))}
          </section>
        ) : null}
        {older.length ? (
          <section aria-label={t("digestEarlier")}>
            <h3 className={styles.groupTitle}>{t("digestEarlier")}</h3>
            <ul className={styles.list}>{older.map(row)}</ul>
          </section>
        ) : null}
      </div>
    );
  };

  return (
    <div className="stack">
      {suggestions.map((r) => (
        <div
          key={r.id}
          className={styles.suggestion}
          role="group"
          aria-label={t("rules.suggested")}
          data-testid="rule-suggestion"
        >
          <Sparkles aria-hidden="true" />
          <p>
            <strong>{t("rules.suggested")}</strong> {r.label}
          </p>
          <div className={styles.suggestionActions}>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => decideRule(r.id, true), t("rules.accepted"))}
            >
              <Check aria-hidden="true" />
              {t("rules.accept")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => decideRule(r.id, false), t("rules.refused"))}
            >
              <X aria-hidden="true" />
              {t("rules.refuse")}
            </Button>
          </div>
        </div>
      ))}

      <Tabs
        label={t("tabsLabel")}
        // Open on the most pressing tab that has something in it.
        defaultIndex={Math.max(
          0,
          PRIORITIES.findIndex((p) => items.some((n) => n.priority === p)),
        )}
        items={PRIORITIES.map((p) => ({
          id: p,
          label: `${t(`tabs.${p}`)} (${items.filter((n) => n.priority === p).length})`,
          content: list(p),
        }))}
      />

      {active.length ? (
        <details className={styles.rules}>
          <summary>{t("rules.active", { count: active.length })}</summary>
          <ul>
            {active.map((r) => (
              <li key={r.id}>
                <span>{r.label.replace(/ \?$/, "")}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoving(r)}
                  aria-label={`${t("rules.delete")} : ${r.label}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("rules.delete")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => removing && run(() => deleteRule(removing.id), t("rules.deleted"))}
            >
              {t("rules.delete")}
            </Button>
          </>
        }
      >
        {removing ? t("rules.deleteConfirm", { label: removing.label.replace(/ \?$/, "") }) : null}
      </Modal>
    </div>
  );
}
