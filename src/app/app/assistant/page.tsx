import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Plus, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { buttonClass, Card } from "@/components/ui";
import { conversationItems } from "@/lib/ai/assistant/session";
import type { ChatItem } from "@/lib/assistant/chat";
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
  const { data: conversations } = await supabase
    .from("ai_conductor_ai_conversations")
    .select("id, title, updated_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(30);
  const current =
    c && UUID.test(c) ? ((conversations ?? []).find((x) => x.id === c) ?? null) : null;
  const items: ChatItem[] = current ? await conversationItems(current.id) : [];

  const suggestions = (["a", "b", "c"] as const).map((k) => t(`suggestions.${profile.role}.${k}`));

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        <Link
          href="/app/settings/assistant"
          className={`${buttonClass({ variant: "secondary", size: "sm" })} ${styles.newChat}`}
        >
          <Settings aria-hidden="true" />
          {t("settingsLink")}
        </Link>
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
            conversationId={current?.id ?? null}
            initialItems={items}
            suggestions={suggestions}
          />
        </Card>
      </div>
    </div>
  );
}
