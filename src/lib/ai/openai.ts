import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;

/** The only AI provider (text, voice, transcription, images). */
export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export const textModel = () => env.OPENAI_TEXT_MODEL;
