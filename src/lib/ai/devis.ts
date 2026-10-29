import "server-only";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { z } from "zod";
import { VAT_RATES } from "@/lib/workflows/devis";
import { openai, textModel } from "./openai";
import { BASE_SYSTEM_PROMPT } from "./system-prompt";

const DEVIS_PROMPT = `${BASE_SYSTEM_PROMPT}

Tâche : à partir du constat d’un technicien (notes + photos), rédige un rapport d’intervention et un projet de devis.
- "title" : intitulé court des travaux.
- "summary" : synthèse du constat en 2 à 4 phrases, pour le client.
- "diagnosis" : cause probable et travaux recommandés, pour l’équipe.
- "lines" : postes du devis (fournitures, main-d’œuvre en heures, déplacement…), avec quantité et prix unitaire HT réalistes pour la France.
- "tax_rate" : 10 pour des travaux de rénovation dans un logement de plus de 2 ans, sinon 20.
Le devis sera relu et corrigé par un humain avant envoi.`;

// Strict JSON schema for structured outputs.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "diagnosis", "tax_rate", "lines"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    diagnosis: { type: "string" },
    tax_rate: { type: "number", enum: [...VAT_RATES] },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "quantity", "unit_price_ht"],
        properties: {
          label: { type: "string" },
          quantity: { type: "number" },
          unit_price_ht: { type: "number" },
        },
      },
    },
  },
} as const;

const draftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  diagnosis: z.string(),
  tax_rate: z.number(),
  lines: z
    .array(z.object({ label: z.string(), quantity: z.number(), unit_price_ht: z.number() }))
    .min(1),
});

export type DevisDraft = z.infer<typeof draftSchema>;

/** Drafts a site report + quote from the technician's notes and photos. */
export async function draftDevis(input: {
  incidentTitle: string;
  description: string;
  address: string;
  notes: string;
  photoUrls: readonly string[];
  /** Company pricing guidance (settings): hourly rate, travel, margins… */
  pricingNote?: string;
}): Promise<DevisDraft> {
  const content: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: [
        `Dossier : ${input.incidentTitle}`,
        `Signalement du client : ${input.description || "—"}`,
        `Adresse : ${input.address || "—"}`,
        `Constat du technicien : ${input.notes}`,
        ...(input.pricingNote
          ? [`Consignes de chiffrage de l’entreprise : ${input.pricingNote}`]
          : []),
      ].join("\n"),
    },
    // A few photos are enough; low detail keeps the call fast and cheap.
    ...input.photoUrls
      .slice(0, 4)
      .map((url): ChatCompletionContentPart => ({
        type: "image_url",
        image_url: { url, detail: "low" },
      })),
  ];

  const completion = await openai().chat.completions.create({
    model: textModel(),
    temperature: 0.2,
    messages: [
      { role: "system", content: DEVIS_PROMPT },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "devis", strict: true, schema: SCHEMA },
    },
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Empty AI response");
  return draftSchema.parse(JSON.parse(raw));
}
