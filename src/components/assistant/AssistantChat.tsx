"use client";

import { Fragment, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Search, Send, Sparkles, X } from "lucide-react";
import { decideAiAction, sendAssistantMessage } from "@/app/app/assistant/actions";
import { Badge, Button, useToast, type BadgeTone } from "@/components/ui";
import type { AiActionStatus } from "@/lib/db/types";
import styles from "./AssistantChat.module.css";

export type ChatItem =
  | { id: string; kind: "user" | "assistant"; text: string; at: string }
  | { id: string; kind: "read"; tool: string; at: string }
  | {
      id: string;
      kind: "proposal";
      at: string;
      action: { id: string; summary: string; status: AiActionStatus };
    };

type Props = {
  conversationId: string | null;
  items: ChatItem[];
  assistantName: string;
  suggestions: string[];
};

const STATUS_TONE: Record<AiActionStatus, BadgeTone> = {
  pending: "warning",
  approved: "info",
  executed: "success",
  rejected: "neutral",
  failed: "danger",
  expired: "neutral",
};

/** **bold** and simple lists — the model's usual Markdown, without injecting HTML. */
function RichText({ text }: { text: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      );
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`l${blocks.length}`}>
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const item = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (item) list.push(item[1]);
    else {
      flush();
      if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

function Proposal({ action }: { action: { id: string; summary: string; status: AiActionStatus } }) {
  const t = useTranslations("assistant.proposal");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (approve: boolean) =>
    startTransition(async () => {
      const r = await decideAiAction(action.id, approve);
      if (r.ok) toast(approve ? t("executed") : t("rejected"));
      else toast(tAll(r.error), "error");
      router.refresh();
    });

  return (
    <div className={styles.proposal} data-testid="ai-proposal">
      <div className={styles.proposalHead}>
        <span>{t("title")}</span>
        <Badge tone={STATUS_TONE[action.status]}>{t(`status.${action.status}`)}</Badge>
      </div>
      <p>{action.summary}</p>
      {action.status === "pending" ? (
        <div className={styles.proposalActions}>
          <Button size="sm" loading={pending} onClick={() => decide(true)}>
            <Check aria-hidden="true" />
            {t("approve")}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(false)}>
            <X aria-hidden="true" />
            {t("reject")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AssistantChat({ conversationId, items, assistantName, suggestions }: Props) {
  const t = useTranslations("assistant");
  const tAll = useTranslations();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items.length, sent]);

  // The server copy replaces the optimistic bubble once it arrives.
  useEffect(() => setSent(null), [items.length]);

  function send(body: string) {
    const message = body.trim();
    if (!message || pending) return;
    setSent(message);
    setText("");
    startTransition(async () => {
      const r = await sendAssistantMessage(conversationId, message);
      if (!r.ok) {
        toast(tAll(r.error), "error");
        if (!r.conversationId) setText(message);
      }
      const id = r.conversationId;
      if (id && id !== conversationId) router.replace(`/app/assistant?c=${id}`);
      else router.refresh();
    });
  }

  const time = (at: string) => format.dateTime(new Date(at), { timeStyle: "short" });

  return (
    <section className={styles.chat} aria-label={t("conversation")}>
      <ol className={styles.list} ref={listRef} aria-live="polite">
        {!items.length && !sent ? (
          <li className={styles.welcome}>
            <Sparkles aria-hidden="true" />
            <p>{t("welcome", { name: assistantName })}</p>
            <div className={styles.suggestions} role="group" aria-label={t("suggestionsLabel")}>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={pending}>
                  {s}
                </button>
              ))}
            </div>
          </li>
        ) : null}
        {items.map((item) => {
          if (item.kind === "read") {
            return (
              <li key={item.id} className={styles.read}>
                <Search aria-hidden="true" />
                {t("readTool", {
                  tool: t.has(`tools.${item.tool}`) ? t(`tools.${item.tool}`) : item.tool,
                })}
              </li>
            );
          }
          if (item.kind === "proposal") {
            return (
              <li key={item.id} className={styles.theirs}>
                <Proposal action={item.action} />
              </li>
            );
          }
          return (
            <li key={item.id} className={item.kind === "user" ? styles.mine : styles.theirs}>
              <div className={styles.bubble}>
                {item.kind === "user" ? item.text : <RichText text={item.text} />}
              </div>
              <time className={styles.time} dateTime={item.at}>
                {item.kind === "assistant" ? `${assistantName} · ` : ""}
                {time(item.at)}
              </time>
            </li>
          );
        })}
        {sent ? (
          <li className={styles.mine}>
            <div className={styles.bubble}>{sent}</div>
          </li>
        ) : null}
        {pending ? (
          <li className={styles.thinking} role="status">
            <span className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {t("thinking")}
          </li>
        ) : null}
      </ol>
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">
          {t("placeholder")}
        </label>
        <textarea
          id="assistant-input"
          rows={2}
          value={text}
          placeholder={t("placeholder")}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
        />
        <Button type="submit" loading={pending} disabled={!text.trim()} aria-label={t("send")}>
          <Send aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}
