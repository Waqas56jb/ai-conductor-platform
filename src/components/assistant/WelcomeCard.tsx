"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlarmClock, ArrowRight, ClipboardCheck, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { AssistantAvatar } from "./AssistantAvatar";
import { useAssistant } from "./AssistantProvider";
import styles from "./WelcomeCard.module.css";

export type Priority = { key: "overdue" | "approvals" | "messages"; count: number };

const ICONS = {
  overdue: <AlarmClock />,
  approvals: <ClipboardCheck />,
  messages: <MessageSquare />,
} satisfies Record<Priority["key"], ReactNode>;

/**
 * Top of every dashboard: today's priorities, computed from the user's data,
 * each handed to the assistant with a prefilled task.
 */
export function WelcomeCard({
  firstName,
  company,
  priorities,
  action,
}: {
  firstName: string;
  company: string;
  priorities: Priority[];
  action?: ReactNode;
}) {
  const t = useTranslations("welcome");
  const { settings, openPanel } = useAssistant();

  return (
    <section className={styles.card} aria-labelledby="welcome-title">
      <div className={styles.head}>
        <AssistantAvatar
          type={settings.avatar_type}
          name={settings.display_name}
          size={64}
          className={styles.avatar}
        />
        <div className={styles.intro}>
          <h1 id="welcome-title">{t("title", { name: firstName })}</h1>
          <p>{t("sub", { assistant: settings.display_name, company })}</p>
        </div>
        <div className={styles.headActions}>
          {action}
          <Button variant="secondary" onClick={() => openPanel()}>
            <Sparkles aria-hidden="true" />
            {t("ask")}
          </Button>
        </div>
      </div>
      <ul className={styles.priorities}>
        {priorities.map((p) => (
          <li key={p.key} className={p.count ? styles.due : ""} data-testid={`priority-${p.key}`}>
            <span className={styles.icon} aria-hidden="true">
              {ICONS[p.key]}
            </span>
            <span className={styles.text}>
              <strong>{p.count}</strong>
              <span>{t(`${p.key}.label`, { count: p.count })}</span>
            </span>
            <button
              type="button"
              className={styles.handle}
              onClick={() => openPanel(t(`${p.key}.prompt`))}
              aria-label={`${t("handle")} — ${t(`${p.key}.label`, { count: p.count })}`}
            >
              {t("handle")}
              <ArrowRight aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
