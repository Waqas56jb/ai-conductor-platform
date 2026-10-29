"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { sendCaseMessage, sendGroupMessage } from "@/app/app/cases/actions";
import { Button, Card, useToast } from "@/components/ui";
import type { ChatMessage } from "@/lib/cases/queries";
import styles from "./ChatPanel.module.css";

type Props = {
  incidentId: string;
  kind: "case" | "team";
  title: string;
  description?: string;
  messages: ChatMessage[];
  meId: string;
};

/** New messages arrive through the page's LiveRefresh (Supabase Realtime). */
export function ChatPanel({ incidentId, kind, title, description, messages, meId }: Props) {
  const t = useTranslations("cases.chat");
  const tAll = useTranslations();
  const tr = useTranslations("roles");
  const format = useFormatter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  function send() {
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      const r =
        kind === "case"
          ? await sendCaseMessage(incidentId, body)
          : await sendGroupMessage(incidentId, body);
      if (r.ok) setText("");
      else toast(tAll(r.error), "error");
    });
  }

  return (
    <Card id={kind === "team" ? "team-chat" : "case-chat"} title={title} description={description}>
      <ol className={styles.list} ref={listRef} aria-live="polite" aria-label={title}>
        {messages.length ? (
          messages.map((m) => {
            const mine = m.from_id === meId;
            return (
              <li key={m.id} className={mine ? styles.mine : styles.theirs}>
                <p className={styles.author}>
                  {mine ? null : (
                    <>
                      <strong>{m.from_name}</strong>
                      {m.from_role ? ` · ${tr(m.from_role)}` : ""}
                    </>
                  )}
                </p>
                <p className={styles.bubble}>{m.text}</p>
                <time className={styles.time} dateTime={m.created_at}>
                  {format.dateTime(new Date(m.created_at), {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            );
          })
        ) : (
          <li className={styles.empty}>{t("empty")}</li>
        )}
      </ol>
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor={`chat-${kind}`}>
          {t("placeholder")}
        </label>
        <textarea
          id={`chat-${kind}`}
          rows={1}
          value={text}
          placeholder={t("placeholder")}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          loading={pending}
          disabled={!text.trim()}
          aria-label={t("send")}
        >
          <Send aria-hidden="true" />
        </Button>
      </form>
    </Card>
  );
}
