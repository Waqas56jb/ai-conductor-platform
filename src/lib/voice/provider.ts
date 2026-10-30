import "server-only";
import { toFile } from "openai";
import { openai } from "@/lib/ai/openai";
import type { AssistantVoice } from "@/lib/db/types";
import { env } from "@/lib/env";

/**
 * Voice for the assistant. Two paths, one provider (OpenAI):
 * - realtime: the browser talks to the model over WebRTC with a short-lived
 *   client secret; tools still run on our server (see /api/voice/turn);
 * - fallback: speech-to-text, the usual text assistant, then text-to-speech.
 */

/** The user's voice setting → an OpenAI voice that sounds natural in French. */
export const VOICE_NAMES: Record<Exclude<AssistantVoice, "off">, string> = {
  calm: "marin",
  neutral: "cedar",
  energetic: "coral",
};

export const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
export const SPEECH_MODEL = "gpt-4o-mini-tts";
/** A client secret only has to live until the browser has connected. */
const SECRET_TTL_S = 60;

export type RealtimeTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export interface VoiceProvider {
  /** A client secret for one realtime session, configured server-side. */
  realtimeSession(input: {
    instructions: string;
    tools: RealtimeTool[];
    voice: string;
    language: "fr" | "en";
  }): Promise<{ clientSecret: string; expiresAt: number; model: string }>;
  transcribe(audio: Blob, language: "fr" | "en"): Promise<string>;
  speak(text: string, voice: string, language: "fr" | "en"): Promise<ArrayBuffer>;
}

export function voiceProvider(): VoiceProvider {
  return {
    async realtimeSession({ instructions, tools, voice, language }) {
      const model = env.OPENAI_REALTIME_MODEL;
      const secret = await openai().realtime.clientSecrets.create({
        expires_after: { anchor: "created_at", seconds: SECRET_TTL_S },
        session: {
          type: "realtime",
          model,
          instructions,
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: { model: TRANSCRIBE_MODEL, language },
              noise_reduction: { type: "near_field" },
              turn_detection: { type: "server_vad", silence_duration_ms: 600 },
            },
            output: { voice },
          },
          tools,
          tool_choice: "auto",
        },
      });
      return { clientSecret: secret.value, expiresAt: secret.expires_at, model };
    },

    async transcribe(audio, language) {
      const file = await toFile(audio, "speech.webm", { type: audio.type || "audio/webm" });
      const result = await openai().audio.transcriptions.create({
        model: TRANSCRIBE_MODEL,
        file,
        language,
      });
      return result.text.trim();
    },

    async speak(text, voice, language) {
      const res = await openai().audio.speech.create({
        model: SPEECH_MODEL,
        voice,
        input: text.slice(0, 4000),
        response_format: "mp3",
        instructions:
          language === "en"
            ? "Warm, natural and clear, like a helpful colleague."
            : "Parle en français, d’une voix chaleureuse, naturelle et posée, comme une collègue attentionnée.",
      });
      return res.arrayBuffer();
    },
  };
}
