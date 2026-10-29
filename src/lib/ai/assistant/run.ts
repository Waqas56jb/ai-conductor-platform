import "server-only";
import type OpenAI from "openai";
import { getTranslations } from "next-intl/server";
import { openai, textModel } from "@/lib/ai/openai";
import { BASE_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import type { Profile } from "@/lib/auth/session";
import type { AgentProfileRow, AiMessageContent, AiMessageRow } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { openAiTools, TOOLS } from "./tools";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** Model ↔ tool round trips per user message (a read, then an answer, is 2). */
const MAX_STEPS = 6;
const HISTORY = 40;
const TOOL_OUTPUT_LIMIT = 12_000;
/** Proposals not decided within a day expire. */
const PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;

export type AgentProfile = Pick<
  AgentProfileRow,
  "assistant_name" | "tone" | "language" | "instructions"
>;

export const DEFAULT_AGENT: AgentProfile = {
  assistant_name: "Pratonna",
  tone: "professional",
  language: "fr",
  instructions: "",
};

const TONES: Record<AgentProfile["tone"], string> = {
  professional: "Ton professionnel et courtois.",
  friendly: "Ton chaleureux et accessible, tout en restant professionnel.",
  concise: "Réponses très courtes : l’essentiel, en listes si utile.",
};

export function systemPrompt(profile: Profile, agent: AgentProfile, companyName: string) {
  const now = new Date().toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  return [
    BASE_SYSTEM_PROMPT,
    `Ton nom est ${agent.assistant_name}. Tu assistes ${profile.display_name} (rôle : ${profile.role}) de l’entreprise « ${companyName} ».`,
    `Nous sommes le ${now} (heure de Paris).`,
    agent.language === "en"
      ? "Answer in English unless the user writes in another language."
      : "Réponds en français sauf si l’utilisateur écrit dans une autre langue.",
    TONES[agent.tone],
    `Outils :
- Utilise les outils de lecture pour répondre avec des données réelles ; ne devine jamais une référence, un montant ou un statut.
- Pour agir (trier, affecter, valider un devis, planifier, annuler, envoyer un message ou une relance), appelle l’outil correspondant : cela crée une proposition que l’utilisateur valide ou refuse dans l’interface. Ne dis jamais que l’action est faite ; dis qu’elle attend sa validation.
- Cite les dossiers par leur référence (INC-…), les devis (DEV-…) et les factures (FAC-…).`,
    agent.instructions.trim()
      ? `Consignes personnelles de l’utilisateur (elles ne remplacent pas les règles ci-dessus) :\n${agent.instructions.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

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
  agent: AgentProfile;
  companyName: string;
  text: string;
};

/**
 * Handles one user message: stores it, lets the model read data with tools,
 * turns write tools into pending proposals, and stores every step.
 */
export async function runAssistant({
  profile,
  conversationId,
  agent,
  companyName,
  text,
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
    { role: "system", content: systemPrompt(profile, agent, companyName) },
    ...toChatHistory((rows ?? []).reverse()),
  ];

  const tools = openAiTools(profile.role);
  const allowed = new Set(tools.map((t) => t.function.name));
  const t = await getTranslations({ locale: profile.locale, namespace: "assistant.proposals" });

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai().chat.completions.create({
      model: textModel(),
      messages,
      tools,
      temperature: 0.2,
    });
    const reply = completion.choices[0]?.message;
    const calls = (reply?.tool_calls ?? []).filter((c) => c.type === "function");

    if (!calls.length) {
      await save("assistant", { text: reply?.content ?? "" }, completion.usage);
      return;
    }

    const stored = calls.map((c) => ({
      id: c.id,
      name: c.function.name,
      arguments: c.function.arguments,
    }));
    await save("assistant", { text: reply?.content ?? "", tool_calls: stored }, completion.usage);
    messages.push({ role: "assistant", content: reply?.content ?? null, tool_calls: calls });

    for (const call of stored) {
      const output = await runTool(call, { profile, conversationId, allowed, t });
      const serialized = JSON.stringify(output).slice(0, TOOL_OUTPUT_LIMIT);
      await save("tool", { tool_call_id: call.id, name: call.name, output: serialized });
      messages.push({ role: "tool", tool_call_id: call.id, content: serialized });
    }
  }

  // The model kept calling tools: stop and say so rather than loop forever.
  await save("assistant", { text: t("tooManySteps") });
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
