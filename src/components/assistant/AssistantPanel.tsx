"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Maximize2, Plus, Settings, X } from "lucide-react";
import { AssistantAvatar } from "./AssistantAvatar";
import { AssistantChat } from "./AssistantChat";
import { useAssistant } from "./AssistantProvider";
import styles from "./AssistantPanel.module.css";

/** Slide-over chat, reachable from every page through the header button. */
export function AssistantPanel() {
  const t = useTranslations("assistant");
  const { role, settings, panel, closePanel, conversationId, setConversationId, openPanel } =
    useAssistant();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!panel.open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [panel.open, panel.nonce, closePanel]);

  if (!panel.open) return null;

  const suggestions = (["a", "b", "c"] as const).map((k) => t(`suggestions.${role}.${k}`));

  return (
    <>
      <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />
      <aside
        ref={ref}
        id="assistant-panel"
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-panel-title"
      >
        <header className={styles.panelHead}>
          <AssistantAvatar type={settings.avatar_type} name={settings.display_name} size={44} />
          <div className={styles.panelTitle}>
            <h2 id="assistant-panel-title">{settings.display_name}</h2>
            <p>
              <span className={styles.onlineInline} aria-hidden="true" />
              {t("panel.subtitle")}
            </p>
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.panelIcon}
              onClick={() => {
                setConversationId(null);
                openPanel();
              }}
              aria-label={t("newChat")}
              title={t("newChat")}
            >
              <Plus aria-hidden="true" />
            </button>
            <Link
              href={conversationId ? `/app/assistant?c=${conversationId}` : "/app/assistant"}
              className={styles.panelIcon}
              onClick={closePanel}
              aria-label={t("panel.fullPage")}
              title={t("panel.fullPage")}
            >
              <Maximize2 aria-hidden="true" />
            </Link>
            <Link
              href="/app/settings/assistant"
              className={styles.panelIcon}
              onClick={closePanel}
              aria-label={t("panel.settings")}
              title={t("panel.settings")}
            >
              <Settings aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={styles.panelIcon}
              onClick={closePanel}
              aria-label={t("panel.close")}
              title={t("panel.close")}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>
        <AssistantChat
          key={panel.nonce}
          variant="panel"
          conversationId={conversationId}
          initialItems={null}
          prefill={panel.prefill}
          suggestions={suggestions}
          onConversation={setConversationId}
        />
      </aside>
    </>
  );
}
