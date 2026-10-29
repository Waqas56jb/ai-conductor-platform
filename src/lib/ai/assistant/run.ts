import "server-only";
import type OpenAI from "openai";
import { getTranslations } from "next-intl/server";
import { openai, textModel } from "@/lib/ai/openai";
import {
  assistantSystemPrompt,
  type AssistantPersona,
  type PromptMemory,
} from "@/lib/ai/system-prompt";
import type { Profile } from "@/lib/auth/session";
import type { AiActionStatus, AiMessageContent, AiMessageRow } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { openAiTools, TOOLS } from "./tools";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** Model ↔ tool round trips per user message (a read, then an answer, is 2). */
const MAX_STEPS = 6;
const HISTORY = 40;
const TOOL_OUTPUT_LIMIT = 12_000;
/** Proposals not decided within a day expire. */
const PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;

/** What the client sees while a reply is produced (streamed as NDJSON). */
export type AssistantEvent =
  | { type: "conversation"; id: string }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  | {
      type: "proposal";
      action: { id: string; summary: string; status: AiActionStatus };
    }
  | { type: "error"; error: string }
  | { type: "done" };

/** Rebuilds the model history from stored rows (oldest first). */
export function toChatHistory(rows: Pick<AiMessageRow, "role" | "content">[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const { role, content } of rows) {
    if (role === "user" && "text" in content) out.push({ role: "user", content: content.text });
    else if (role === "assistant" && "tool_calls" in content) {
      out.push({
        role: "assistant",
        content: content.text || null,
        tool_calls: content.tool_calls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: c.arguments },
        })),
      });
    } else if (role === "assistant" && "text" in content) {
      out.push({ role: "assistant", content: content.text });
    } else if (role === "tool" && "tool_call_id" in content) {
      out.push({ role: "tool", tool_call_id: content.tool_call_id, content: content.output });
    }
  }
  // A window cut in the middle of a tool exchange is not a valid history.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

type RunInput = {
  profile: Profile;
  conversationId: string;
  persona: AssistantPersona;
  memories: readonly PromptMemory[];
  companyName: string;
  text: string;
  emit: (event: AssistantEvent) => void;
};

type StreamedCall = { id: string; name: string; arguments: string };

/** One streamed completion: text deltas go to `emit`, tool calls are assembled. */
async function complete(
  messages: ChatMessage[],
  tools: ReturnType<typeof openAiTools>,
  emit: RunInput["emit"],
) {
  const stream = await openai().chat.completions.create({
    model: textModel(),
    messages,
    tools,
    temperature: 0.2,
    stream: true,
    stream_options: { include_usage: true },
  });
  let text = "";
  const calls: StreamedCall[] = [];
  let usage: OpenAI.CompletionUsage | undefined;
  for await (const chunk of stream) {
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;
    if (delta.content) {
      text += delta.content;
      emit({ type: "delta", text: delta.content });
    }
    for (const c of delta.tool_calls ?? []) {
      const call = (calls[c.index] ??= { id: "", name: "", arguments: "" });
      if (c.id) call.id = c.id;
      if (c.function?.name) call.name += c.function.name;
      if (c.function?.arguments) call.arguments += c.function.arguments;
    }
  }
  return { text, calls: calls.filter((c) => c.id && c.name), usage };
}

/**
 * Handles one user message: stores it, lets the model read data with tools,
 * turns write tools into pending proposals, and stores every step. The reply
 * is streamed to the caller through `emit`.
 */
export async function runAssistant({
  profile,
  conversationId,
  persona,
  memories,
  companyName,
  text,
  emit,
}: RunInput) {
  const admin = createAdminClient();
  const save = async (
    role: AiMessageRow["role"],
    content: AiMessageContent,
    usage?: OpenAI.CompletionUsage,
  ) => {
    const { error } = await admin.from("ai_conductor_ai_messages").insert({
      company_id: profile.company_id,
      conversation_id: conversationId,
      role,
      content,
      input_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
    });
    if (error) throw new Error(`assistant message not saved: ${error.message}`);
  };

  await save("user", { text });

  const { data: rows } = await admin
    .from("ai_conductor_ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: assistantSystemPrompt({ profile, persona, companyName, memories }),
    },
    ...toChatHistory((rows ?? []).reverse()),
  ];

  const tools = openAiTools(profile.role);
  const allowed = new Set(tools.map((t) => t.function.name));
  const t = await getTranslations({ locale: profile.locale, namespace: "assistant.proposals" });

  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await complete(messages, tools, emit);

    if (!reply.calls.length) {
      await save("assistant", { text: reply.text }, reply.usage);
      return;
    }

    await save("assistant", { text: reply.text, tool_calls: reply.calls }, reply.usage);
    messages.push({
      role: "assistant",
      content: reply.text || null,
      tool_calls: reply.calls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.arguments },
      })),
    });

    for (const call of reply.calls) {
      emit({ type: "tool", name: call.name });
      const output = await runTool(call, { profile, conversationId, allowed, t });
      if (output && typeof output === "object" && "proposal_id" in output && "summary" in output) {
        emit({
          type: "proposal",
          action: {
            id: String(output.proposal_id),
            summary: String(output.summary),
            status: "pending",
          },
        });
      }
      const serialized = JSON.stringify(output).slice(0, TOOL_OUTPUT_LIMIT);
      await save("tool", { tool_call_id: call.id, name: call.name, output: serialized });
      messages.push({ role: "tool", tool_call_id: call.id, content: serialized });
    }
  }

  // The model kept calling tools: stop and say so rather than loop forever.
  const stop = t("tooManySteps");
  emit({ type: "delta", text: stop });
  await save("assistant", { text: stop });
}

async function runTool(
  call: { name: string; arguments: string },
  ctx: {
    profile: Profile;
    conversationId: string;
    allowed: Set<string>;
    t: Awaited<ReturnType<typeof getTranslations>>;
  },
): Promise<unknown> {
  const def = TOOLS[call.name];
  if (!def || !ctx.allowed.has(call.name)) return { error: "Tool not available for this user" };

  let raw: unknown;
  try {
    raw = JSON.parse(call.arguments || "{}");
  } catch {
    return { error: "Arguments are not valid JSON" };
  }
  const parsed = def.schema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid arguments", issues: parsed.error.issues };

  if (def.kind === "read") {
    try {
      return await def.run(parsed.data as never, ctx.profile);
    } catch (e) {
      console.error(`[assistant] ${call.name} failed`, e);
      return { error: "Read failed" };
    }
  }

  const summary = def.describe(parsed.data as never, (key, values) => ctx.t(key, values));
  const { data, error } = await createAdminClient()
    .from("ai_conductor_ai_actions")
    .insert({
      company_id: ctx.profile.company_id,
      user_id: ctx.profile.id,
      conversation_id: ctx.conversationId,
      tool: call.name,
      input: parsed.data as Record<string, unknown>,
      summary,
      status: "pending",
      expires_at: new Date(Date.now() + PROPOSAL_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Proposal not saved" };
  return { proposal_id: data.id, status: "pending_user_approval", summary };
}
