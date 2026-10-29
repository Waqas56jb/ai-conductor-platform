"use client";

import { useTranslations } from "next-intl";
import { AssistantAvatar } from "./AssistantAvatar";
import { useAssistant } from "./AssistantProvider";
import styles from "./AssistantPanel.module.css";

/** Top-right entry point on every /app page: opens the assistant slide-over. */
export function AssistantButton() {
  const t = useTranslations("assistant.entry");
  const { settings, panel, openPanel } = useAssistant();

  return (
    <button
      type="button"
      className={styles.entry}
      onClick={() => openPanel()}
      aria-label={t("aria", { name: settings.display_name })}
      aria-haspopup="dialog"
      aria-expanded={panel.open}
      aria-controls="assistant-panel"
      data-testid="assistant-button"
    >
      <span className={styles.entryAvatar}>
        <AssistantAvatar type={settings.avatar_type} name={settings.display_name} size={40} />
        <span className={styles.online} aria-hidden="true" />
      </span>
      <span className={styles.entryLabel}>{t("label")}</span>
    </button>
  );
}
