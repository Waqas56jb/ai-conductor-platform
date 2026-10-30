import "server-only";
import { z } from "zod";
import type { MeetingAction } from "@/lib/db/types";
import { openai, textModel } from "./openai";
import { BASE_SYSTEM_PROMPT } from "./system-prompt";

const MEETING_PROMPT = `${BASE_SYSTEM_PROMPT}
Tâche : à partir des notes ou de la transcription d’une réunion, rédige un compte rendu.
- "summary" : synthèse en 3 à 6 phrases, factuelle, sans inventer.
- "decisions" : les décisions prises (phrases courtes). Liste vide s’il n’y en a pas.
- "actions" : les actions à mener. "title" à l’infinitif ; "owner" = nom de la personne responsable si elle est citée, sinon null ; "due" = date AAAA-MM-JJ si une échéance est citée (la date de la réunion sert de référence pour « vendredi », « la semaine prochaine »…), sinon null.
Le compte rendu sera relu par un humain ; aucune tâche n’est créée sans son accord.`;

// Strict JSON schema for structured outputs.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "decisions", "actions"],
  properties: {
    summary: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "owner", "due"],
        properties: {
          title: { type: "string" },
          owner: { type: ["string", "null"] },
          due: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

const resultSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()),
  actions: z.array(
    z.object({
      title: z.string().trim().min(1).max(200),
      owner: z.string().max(120).nullable(),
      due: z.iso.date().nullable().catch(null),
    }),
  ),
});

export type MeetingSummary = {
  summary: string;
  decisions: { text: string }[];
  actions: MeetingAction[];
};

/** Summary, decisions and action items of a meeting, from its notes or transcript. */
export async function summarizeMeeting(input: {
  title: string;
  heldAt: string;
  participants: string;
  transcript: string;
}): Promise<MeetingSummary> {
  const completion = await openai().chat.completions.create({
    model: textModel(),
    temperature: 0.2,
    messages: [
      { role: "system", content: MEETING_PROMPT },
      {
        role: "user",
        content: [
          `Réunion : ${input.title}`,
          `Date : ${new Date(input.heldAt).toLocaleDateString("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" })}`,
          `Participants : ${input.participants || "—"}`,
          "",
          input.transcript.slice(0, 60_000),
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "meeting_summary", strict: true, schema: SCHEMA },
    },
  });
  const parsed = resultSchema.parse(JSON.parse(completion.choices[0]?.message.content ?? "{}"));
  return {
    summary: parsed.summary.trim(),
    decisions: parsed.decisions.filter((d) => d.trim()).map((text) => ({ text: text.trim() })),
    actions: parsed.actions.map((a) => ({
      title: a.title,
      owner: a.owner?.trim() || null,
      due: a.due,
    })),
  };
}
