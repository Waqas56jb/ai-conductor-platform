import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAssistantSettings } from "@/lib/ai/assistant/session";
import { getProfile } from "@/lib/auth/session";
import { VOICE_NAMES, voiceProvider } from "@/lib/voice/provider";

const bodySchema = z.object({ text: z.string().trim().min(1).max(1500) });

/** Fallback path, last step: the assistant's answer read aloud, in the user's voice setting. */
export async function POST(request: NextRequest) {
  if (!(await getProfile()))
    return NextResponse.json({ error: "common.unauthorized" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "assistant.errors.empty" }, { status: 400 });
  const { voice, language } = await getAssistantSettings();
  if (voice === "off") return NextResponse.json({ error: "assistant.voice.off" }, { status: 409 });

  try {
    const audio = await voiceProvider().speak(body.data.text, VOICE_NAMES[voice], language);
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[voice] speech failed", e);
    return NextResponse.json({ error: "assistant.voice.failed" }, { status: 502 });
  }
}
