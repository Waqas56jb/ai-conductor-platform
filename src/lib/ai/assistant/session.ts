import "server-only";
import {
  ASSISTANT_COLUMNS,
  DEFAULT_ASSISTANT,
  type AssistantSettings,
} from "@/lib/assistant/defaults";
import type { ChatItem } from "@/lib/assistant/chat";
import type { Profile } from "@/lib/auth/session";
import type { AssistantMemoryRow } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** User messages per user in RATE_WINDOW_MS (each one may cost several model calls). */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

export async function rateLimited(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { data: conversations } = await admin
    .from("ai_conductor_ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .gte("updated_at", since);
  const ids = (conversations ?? []).map((c) => c.id);
  if (!ids.length) return false;
  const { count } = await admin
    .from("ai_conductor_ai_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user")
    .gte("created_at", since);
  return (count ?? 0) >= RATE_LIMIT;
}

/** The user's open conversation, or a new one titled after the first message. */
export async function openConversation(
  profile: Profile,
  conversationId: string | null,
  firstText: string,
  channel: "chat" | "voice" = "chat",
): Promise<string | null> {
  const admin = createAdminClient();
  if (conversationId) {
    const { data } = await admin
      .from("ai_conductor_ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", profile.id)
      .is("archived_at", null)
      .maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await admin
    .from("ai_conductor_ai_conversations")
    .insert({
      company_id: profile.company_id,
      user_id: profile.id,
      title: firstText.slice(0, 80),
      channel,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

/** Voice sessions per user in RATE_WINDOW_MS (each holds a realtime connection). */
const VOICE_SESSION_LIMIT = 10;

export async function voiceRateLimited(userId: string): Promise<boolean> {
  const { count } = await createAdminClient()
    .from("ai_conductor_ai_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", "voice")
    .gte("updated_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  return (count ?? 0) >= VOICE_SESSION_LIMIT || rateLimited(userId);
}

/** What every assistant turn needs: persona, approved memories, company name. */
export async function assistantContext(profile: Profile) {
  const admin = createAdminClient();
  const [persona, { data: memories }, { data: company }] = await Promise.all([
    getAssistantSettings(),
    admin
      .from("ai_conductor_assistant_memories")
      .select("kind, content, approved")
      .eq("user_id", profile.id)
      .eq("approved", true)
      .order("created_at")
      .limit(50),
    admin.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
  ]);
  return { persona, memories: memories ?? [], companyName: company?.name ?? "" };
}

/** The user's assistant settings (defaults until they change something). Through RLS. */
export async function getAssistantSettings(): Promise<AssistantSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_assistant_profiles")
    .select(ASSISTANT_COLUMNS)
    .maybeSingle();
  return data ?? DEFAULT_ASSISTANT;
}

/** Every memory and rule of the user, newest first. Through RLS. */
export async function listMemories(): Promise<AssistantMemoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_assistant_memories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

/** A conversation as chat items: messages, tool reads and proposals with their live status. */
export async function conversationItems(conversationId: string): Promise<ChatItem[]> {
  const supabase = await createClient();
  const [{ data: messages }, { data: actions }] = await Promise.all([
    supabase
      .from("ai_conductor_ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(300),
    supabase
      .from("ai_conductor_ai_actions")
      .select("id, summary, status")
      .eq("conversation_id", conversationId),
  ]);
  const byId = new Map((actions ?? []).map((a) => [a.id, a]));
  return (messages ?? []).flatMap((m): ChatItem[] => {
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
