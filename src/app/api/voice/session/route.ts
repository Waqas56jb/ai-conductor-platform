import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assistantContext, openConversation, voiceRateLimited } from "@/lib/ai/assistant/session";
import { openAiTools } from "@/lib/ai/assistant/tools";
import { assistantSystemPrompt } from "@/lib/ai/system-prompt";
import { audit } from "@/lib/audit";
import { getProfile } from "@/lib/auth/session";
import { VOICE_NAMES, voiceProvider } from "@/lib/voice/provider";

const bodySchema = z.object({ conversationId: z.uuid().nullable() });

export type VoiceSession =
  | {
      mode: "realtime";
      conversationId: string;
      clientSecret: string;
      expiresAt: number;
      model: string;
    }
  /** Speech-to-text → text assistant → text-to-speech (`speak: false` when the voice is off). */
  | { mode: "fallback"; conversationId: string; speak: boolean };

/**
 * Starts a voice turn: a short-lived OpenAI Realtime client secret carrying
 * the user's persona, approved memories and role tools (never our API key).
 * When the voice is off or Realtime is unavailable, the browser falls back to
 * transcription + the text assistant (+ speech).
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "common.unauthorized" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "assistant.errors.notFound" }, { status: 400 });
  if (await voiceRateLimited(profile.id))
    return NextResponse.json({ error: "assistant.errors.rateLimited" }, { status: 429 });

  const conversationId = await openConversation(
    profile,
    body.data.conversationId,
    "Conversation vocale",
    "voice",
  );
  if (!conversationId)
    return NextResponse.json({ error: "assistant.errors.notFound" }, { status: 404 });

  const { persona, memories, companyName } = await assistantContext(profile);
  const fallback = (speak: boolean): VoiceSession => ({ mode: "fallback", conversationId, speak });
  if (persona.voice === "off") return NextResponse.json(fallback(false));

  try {
    const session = await voiceProvider().realtimeSession({
      instructions: assistantSystemPrompt({
        profile,
        persona,
        companyName,
        memories,
        channel: "voice",
      }),
      tools: openAiTools(profile.role).map((t) => ({
        type: "function" as const,
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
      voice: VOICE_NAMES[persona.voice],
      language: persona.language,
    });
    await audit(
      profile,
      "voice.session_started",
      { type: "conversation", id: conversationId },
      {
        model: session.model,
      },
    );
    return NextResponse.json({
      mode: "realtime",
      conversationId,
      ...session,
    } satisfies VoiceSession);
  } catch (e) {
    console.error("[voice] realtime session refused", e);
    return NextResponse.json(fallback(true));
  }
}
