"use client";

import { Fragment, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Mic, MicOff, Search, Send, X } from "lucide-react";
import { decideAiAction } from "@/app/app/assistant/actions";
import { Badge, Button, useToast, type BadgeTone } from "@/components/ui";
import type { ChatItem } from "@/lib/assistant/chat";
import type { AiActionStatus } from "@/lib/db/types";
import type { AssistantEvent } from "@/lib/ai/assistant/run";
import { AssistantAvatar } from "./AssistantAvatar";
import { useAssistant } from "./AssistantProvider";
import { useVoice } from "./useVoice";
import styles from "./AssistantChat.module.css";

type Props = {
  conversationId: string | null;
  /** Server-rendered items (page); null loads them (panel). */
  initialItems: ChatItem[] | null;
  suggestions: string[];
  prefill?: string;
  variant?: "page" | "panel";
  onConversation?: (id: string) => void;
};

type Proposal = { id: string; summary: string; status: AiActionStatus };

/** The reply being streamed: its text, the tools it read and what it proposed. */
type Live = { text: string; reads: string[]; proposals: Proposal[] };

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

function ProposalCard({ action, onDecided }: { action: Proposal; onDecided: () => void }) {
  const t = useTranslations("assistant.proposal");
  const tAll = useTranslations();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const decide = (approve: boolean) =>
    startTransition(async () => {
      const r = await decideAiAction(action.id, approve);
      if (r.ok) toast(approve ? t("executed") : t("rejected"));
      else toast(tAll(r.error), "error");
      onDecided();
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

async function loadItems(id: string): Promise<ChatItem[] | null> {
  const res = await fetch(`/api/assistant?c=${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return ((await res.json()) as { items: ChatItem[] }).items;
}

export function AssistantChat({
  conversationId: initialId,
  initialItems,
  suggestions,
  prefill = "",
  variant = "page",
  onConversation,
}: Props) {
  const t = useTranslations("assistant");
  const tAll = useTranslations();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const { settings } = useAssistant();
  const inputId = useId();
  const voiceStatusId = useId();
  const [conversationId, setConversationId] = useState(initialId);
  const [items, setItems] = useState<ChatItem[]>(initialItems ?? []);
  const [text, setText] = useState(prefill);
  const [sent, setSent] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const name = settings.display_name;

  // The page stays mounted when its URL catches up with a new conversation
  // (no lost draft); only switching to another conversation resets the chat.
  const [shownId, setShownId] = useState(initialId);
  if (initialId !== shownId) {
    setShownId(initialId);
    if (initialId !== conversationId) {
      setConversationId(initialId);
      setItems(initialItems ?? []);
      setText("");
    }
  }

  // The panel opens on an existing conversation: fetch it.
  useEffect(() => {
    if (initialItems || !initialId) return;
    let cancelled = false;
    loadItems(initialId).then((loaded) => !cancelled && loaded && setItems(loaded));
    return () => {
      cancelled = true;
    };
  }, [initialId, initialItems]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items.length, sent, live?.text, live?.reads.length, live?.proposals.length]);

  // The latest conversation id, for callbacks that outlive a render (voice).
  const idRef = useRef(conversationId);
  idRef.current = conversationId;

  function adopt(id: string) {
    if (id === idRef.current) return;
    idRef.current = id;
    setConversationId(id);
    onConversation?.(id);
    // The full page keeps the conversation in its URL.
    if (variant === "page") window.history.replaceState(null, "", `/app/assistant?c=${id}`);
  }

  async function refresh(id: string | null) {
    if (id) {
      const loaded = await loadItems(id);
      if (loaded) setItems(loaded);
    }
    router.refresh();
  }

  /** Sends a message and streams the reply; resolves with the reply's text. */
  async function send(body: string): Promise<string> {
    const message = body.trim();
    if (!message || busy) return "";
    let answer = "";
    setSent(message);
    setText("");
    setBusy(true);
    setLive({ text: "", reads: [], proposals: [] });
    let id = idRef.current;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, text: message }),
      });
      if (!res.ok || !res.body) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        toast(tAll(error ?? "common.error"), "error");
        setText(message);
        return "";
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const event = JSON.parse(line) as AssistantEvent;
          if (event.type === "conversation") {
            id = event.id;
            adopt(id);
          } else if (event.type === "delta") {
            answer += event.text;
            setLive((l) => l && { ...l, text: l.text + event.text });
          } else if (event.type === "tool") {
            setLive((l) => l && { ...l, reads: [...l.reads, event.name] });
          } else if (event.type === "proposal") {
            setLive((l) => l && { ...l, proposals: [...l.proposals, event.action] });
          } else if (event.type === "error") {
            toast(tAll(event.error), "error");
          }
        }
      }
    } catch {
      toast(tAll("assistant.errors.failed"), "error");
    } finally {
      await refresh(id);
      setLive(null);
      setSent(null);
      setBusy(false);
    }
    return answer;
  }

  const voice = useVoice({
    conversationId,
    onConversation: adopt,
    onTurn: (id) => {
      loadItems(id).then((loaded) => loaded && setItems(loaded));
    },
    sendText: send,
    onError: (key) => toast(tAll(key), "error"),
  });
  const voiceOn = voice.state !== "idle";
  const stopVoice = () => {
    voice.stop();
    router.refresh();
  };

  const time = (at: string) => format.dateTime(new Date(at), { timeStyle: "short" });
  const toolLabel = (tool: string) => (t.has(`tools.${tool}`) ? t(`tools.${tool}`) : tool);

  return (
    <section
      className={`${styles.chat} ${variant === "panel" ? styles.inPanel : ""}`}
      aria-label={t("conversation", { name })}
    >
      <ol className={styles.list} ref={listRef} aria-live="polite">
        {!items.length && !sent ? (
          <li className={styles.welcome}>
            <AssistantAvatar type={settings.avatar_type} name={name} size={64} />
            <p>{t("welcome", { name })}</p>
            <div className={styles.suggestions} role="group" aria-label={t("suggestionsLabel")}>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={busy}>
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
                {t("readTool", { tool: toolLabel(item.tool) })}
              </li>
            );
          }
          if (item.kind === "proposal") {
            return (
              <li key={item.id} className={styles.theirs}>
                <ProposalCard action={item.action} onDecided={() => refresh(idRef.current)} />
              </li>
            );
          }
          return (
            <li key={item.id} className={item.kind === "user" ? styles.mine : styles.theirs}>
              <div className={styles.bubble}>
                {item.kind === "user" ? item.text : <RichText text={item.text} />}
              </div>
              <time className={styles.time} dateTime={item.at}>
                {item.kind === "assistant" ? `${name} · ` : ""}
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
        {live?.reads.map((tool, i) => (
          <li key={`r${i}`} className={styles.read}>
            <Search aria-hidden="true" />
            {t("readTool", { tool: toolLabel(tool) })}
          </li>
        ))}
        {live?.proposals.map((action) => (
          <li key={action.id} className={styles.theirs}>
            <ProposalCard action={action} onDecided={() => refresh(idRef.current)} />
          </li>
        ))}
        {live?.text ? (
          <li className={styles.theirs}>
            <div className={`${styles.bubble} ${styles.streaming}`}>
              <RichText text={live.text} />
            </div>
          </li>
        ) : busy ? (
          <li className={styles.thinking} role="status">
            <span className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {t("thinking", { name })}
          </li>
        ) : null}
        {voice.heard ? (
          <li className={styles.mine}>
            <div className={`${styles.bubble} ${styles.streaming}`}>{voice.heard}</div>
          </li>
        ) : null}
        {voice.saying ? (
          <li className={styles.theirs}>
            <div className={`${styles.bubble} ${styles.streaming}`}>{voice.saying}</div>
          </li>
        ) : null}
      </ol>
      {voiceOn ? (
        <div
          className={styles.voiceBar}
          role="status"
          id={voiceStatusId}
          data-testid="voice-status"
          data-state={voice.state}
          data-mode={voice.mode ?? ""}
        >
          <span className={`${styles.wave} ${styles[voice.state] ?? ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className={styles.voiceText}>{t(`voice.state.${voice.state}`, { name })}</span>
          {voice.state === "recording" ? (
            <Button size="sm" onClick={voice.sendRecording}>
              <Send aria-hidden="true" />
              {t("voice.sendRecording")}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={stopVoice}>
            <MicOff aria-hidden="true" />
            {t("voice.stop")}
          </Button>
        </div>
      ) : null}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          {t("placeholder")}
        </label>
        <textarea
          id={inputId}
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
        <Button
          variant={voiceOn ? "primary" : "secondary"}
          aria-label={voiceOn ? t("voice.stop") : t("mic", { name })}
          aria-pressed={voiceOn}
          aria-describedby={voiceOn ? voiceStatusId : undefined}
          data-testid="assistant-mic"
          onClick={() => (voiceOn ? stopVoice() : voice.start())}
        >
          {voiceOn ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
        </Button>
        <Button type="submit" loading={busy} disabled={!text.trim()} aria-label={t("send")}>
          <Send aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}
