import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AgentProfileForm } from "@/components/assistant/AgentProfileForm";
import { AssistantChat, type ChatItem } from "@/components/assistant/AssistantChat";
import { buttonClass, Card } from "@/components/ui";
import { DEFAULT_AGENT } from "@/lib/ai/assistant/run";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { archiveConversation } from "./actions";
import styles from "@/components/assistant/AssistantChat.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("assistant"))("title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const profile = await requireProfile();
  const { c } = await searchParams;
  const t = await getTranslations("assistant");
  const supabase = await createClient();

  // RLS: each user only ever reads their own assistant data.
  const [{ data: conversations }, { data: agentRow }] = await Promise.all([
    supabase
      .from("ai_conductor_ai_conversations")
      .select("id, title, updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("ai_conductor_agent_profiles")
      .select("assistant_name, tone, language, instructions")
      .maybeSingle(),
  ]);
  const agent = agentRow ?? DEFAULT_AGENT;
  const current =
    c && UUID.test(c) ? ((conversations ?? []).find((x) => x.id === c) ?? null) : null;

  let items: ChatItem[] = [];
  if (current) {
    const [{ data: messages }, { data: actions }] = await Promise.all([
      supabase
        .from("ai_conductor_ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", current.id)
        .order("created_at")
        .limit(300),
      supabase
        .from("ai_conductor_ai_actions")
        .select("id, summary, status")
        .eq("conversation_id", current.id),
    ]);
    const byId = new Map((actions ?? []).map((a) => [a.id, a]));
    items = (messages ?? []).flatMap((m): ChatItem[] => {
      const content = m.content;
      if (m.role === "user" && "text" in content)
        return [{ id: m.id, kind: "user", text: content.text, at: m.created_at }];
      if (m.role === "assistant" && "text" in content && content.text.trim())
        return [{ id: m.id, kind: "assistant", text: content.text, at: m.created_at }];
      if (m.role === "tool" && "tool_call_id" in content) {
        let proposalId: string | undefined;
        try {
          proposalId = (JSON.parse(content.output) as { proposal_id?: string }).proposal_id;
        } catch {
          // Truncated output: shown as a read.
        }
        const action = proposalId ? byId.get(proposalId) : undefined;
        return action
          ? [{ id: m.id, kind: "proposal", at: m.created_at, action }]
          : [{ id: m.id, kind: "read", tool: content.name, at: m.created_at }];
      }
      return [];
    });
  }

  const suggestions = (["a", "b", "c"] as const).map((k) => t(`suggestions.${profile.role}.${k}`));

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <div className={styles.layout}>
        <aside className={styles.history} aria-label={t("history")}>
          <Link
            href="/app/assistant"
            className={`${buttonClass({ variant: "secondary", size: "sm" })} ${styles.newChat}`}
          >
            <Plus aria-hidden="true" />
            {t("newChat")}
          </Link>
          <Card title={t("history")}>
            {conversations?.length ? (
              <ul>
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <Link
                      href={`/app/assistant?c=${conv.id}`}
                      aria-current={conv.id === current?.id ? "page" : undefined}
                    >
                      {conv.title || t("newChat")}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{t("noHistory")}</p>
            )}
          </Card>
        </aside>
        <div className="stack">
          <Card>
            {current ? (
              <div className={styles.toolbar}>
                <strong>{current.title}</strong>
                <form action={archiveConversation.bind(null, current.id)}>
                  <button
                    type="submit"
                    className={buttonClass({ variant: "ghost", size: "sm" })}
                    aria-label={t("archive")}
                    title={t("archive")}
                  >
                    <Archive aria-hidden="true" />
                  </button>
                </form>
              </div>
            ) : null}
            <AssistantChat
              key={current?.id ?? "new"}
              conversationId={current?.id ?? null}
              items={items}
              assistantName={agent.assistant_name}
              suggestions={suggestions}
            />
          </Card>
          <Card title={t("agent.title")} description={t("agent.description")}>
            <AgentProfileForm agent={agent} />
          </Card>
        </div>
      </div>
    </div>
  );
}
