import { NextResponse, type NextRequest } from "next/server";
import { getAssistantSettings, rateLimited } from "@/lib/ai/assistant/session";
import { getProfile } from "@/lib/auth/session";
import { voiceProvider } from "@/lib/voice/provider";

/** About a minute of compressed speech. */
const MAX_BYTES = 4 * 1024 * 1024;

/** Fallback path, step 1: the recorded question as text. */
export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "common.unauthorized" }, { status: 401 });
  if (await rateLimited(profile.id))
    return NextResponse.json({ error: "assistant.errors.rateLimited" }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (
    !(audio instanceof Blob) ||
    !audio.size ||
    audio.size > MAX_BYTES ||
    !audio.type.startsWith("audio/")
  )
    return NextResponse.json({ error: "assistant.voice.badAudio" }, { status: 400 });

  try {
    const { language } = await getAssistantSettings();
    const text = await voiceProvider().transcribe(audio, language);
    return NextResponse.json({ text });
  } catch (e) {
    console.error("[voice] transcription failed", e);
    return NextResponse.json({ error: "assistant.voice.failed" }, { status: 502 });
  }
}
