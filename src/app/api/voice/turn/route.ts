import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { runTool } from "@/lib/ai/assistant/run";
import { openConversation } from "@/lib/ai/assistant/session";
import { openAiTools } from "@/lib/ai/assistant/tools";
import { getProfile } from "@/lib/auth/session";
import type { AiMessageContent, AiMessageRow } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

const TOOL_OUTPUT_LIMIT = 12_000;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    conversationId: z.uuid(),
    kind: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(4000),
  }),
  z.object({
    conversationId: z.uuid(),
    kind: z.literal("tool"),
    callId: z.string().min(1).max(100),
    name: z.string().min(1).max(64),
    arguments: z.string().max(20_000),
  }),
]);

/**
 * One step of a realtime voice conversation, reported by the browser: the
 * transcripts are stored like chat messages, and tool calls run here, on the
 * server, as the user — reads through RLS, writes as pending proposals the
 * user approves on screen. The model never executes anything itself.
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "common.unauthorized" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "assistant.errors.empty" }, { status: 400 });
  const input = body.data;

  // Only the user's own, open conversation.
  const conversationId = await openConversation(profile, input.conversationId, "");
  if (!conversationId)
    return NextResponse.json({ error: "assistant.errors.notFound" }, { status: 404 });

  const admin = createAdminClient();
  const save = async (role: AiMessageRow["role"], content: AiMessageContent) => {
    const { error } = await admin.from("ai_conductor_ai_messages").insert({
      company_id: profile.company_id,
      conversation_id: conversationId,
      role,
      content,
    });
    if (error) throw new Error(`voice message not saved: ${error.message}`);
  };
  const touch = () =>
    admin
      .from("ai_conductor_ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

  if (input.kind !== "tool") {
    await save(input.kind, { text: input.text });
    await touch();
    return NextResponse.json({ ok: true });
  }

  const call = { id: input.callId, name: input.name, arguments: input.arguments };
  await save("assistant", { text: "", tool_calls: [call] });
  const allowed = new Set(openAiTools(profile.role).map((t) => t.function.name));
  const t = await getTranslations({ locale: profile.locale, namespace: "assistant.proposals" });
  const output = await runTool(call, { profile, conversationId, allowed, t });
  const serialized = JSON.stringify(output).slice(0, TOOL_OUTPUT_LIMIT);
  await save("tool", { tool_call_id: call.id, name: call.name, output: serialized });
  await touch();
  return NextResponse.json({ output: serialized });
}
