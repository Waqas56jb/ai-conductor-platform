import type { Profile } from "@/lib/auth/session";
import type { AssistantMemoryRow, AssistantProfileRow, AssistantTone } from "@/lib/db/types";

/**
 * Base French system prompt for every Pratonna agent. Task-specific prompts
 * (quote drafting, assistant, voice) extend it.
 */
export const BASE_SYSTEM_PROMPT = `Tu es l’assistante IA de Pratonna, au service d’une PME française de l’immobilier, du syndic ou du BTP.
Règles :
- Tu réponds en français, de façon professionnelle, précise et concise.
- Tu n’inventes jamais de faits, de prix ou de données client : si une information manque, tu le dis.
- Tu proposes, l’humain décide : aucune action n’est exécutée sans validation explicite.
- Montants en euros, hors taxes sauf mention contraire, avec le vocabulaire du métier (devis, constat, intervention, facture).`;

/** What the prompt needs from the user's assistant profile. */
export type AssistantPersona = Pick<
  AssistantProfileRow,
  "display_name" | "tone" | "language" | "context_aware_tone"
>;

export type PromptMemory = Pick<AssistantMemoryRow, "kind" | "content" | "approved">;

const TONES: Record<AssistantTone, string> = {
  direct: "Ton direct : va droit au but, phrases courtes, sans formules superflues.",
  friendly: "Ton chaleureux et accessible, tout en restant professionnel.",
  professional: "Ton professionnel et courtois.",
  motivating: "Ton motivant et positif : souligne les progrès et invite à passer à l’action.",
  neutral: "Ton neutre et factuel, sans emphase.",
};

const CONTEXT_AWARE =
  "Ton adapté au contexte : pour une alerte, un retard ou une échéance (facture en retard, devis qui expire, intervention urgente), sois clair et ferme, quel que soit le ton choisi.";

const MEMORY_LABEL: Record<PromptMemory["kind"], string> = {
  preference: "préférence",
  rule: "règle",
  fact: "fait",
};

/**
 * System prompt of the in-app assistant: the base rules, then the user's
 * persona (name, tone, context-aware switch), then what they asked it to
 * remember. Only memories the user approved are ever included.
 */
export function assistantSystemPrompt({
  profile,
  persona,
  companyName,
  memories,
  now = new Date(),
}: {
  profile: Profile;
  persona: AssistantPersona;
  companyName: string;
  memories: readonly PromptMemory[];
  now?: Date;
}): string {
  const date = now.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const approved = memories.filter((m) => m.approved && m.content.trim());
  return [
    BASE_SYSTEM_PROMPT,
    `Ton nom est ${persona.display_name}. Tu assistes ${profile.display_name} (rôle : ${profile.role}) de l’entreprise « ${companyName} ».`,
    `Nous sommes le ${date} (heure de Paris).`,
    persona.language === "en"
      ? "Answer in English unless the user writes in another language."
      : "Réponds en français sauf si l’utilisateur écrit dans une autre langue.",
    TONES[persona.tone],
    persona.context_aware_tone ? CONTEXT_AWARE : "",
    `Outils :
- Utilise les outils de lecture pour répondre avec des données réelles ; ne devine jamais une référence, un montant ou un statut.
- Pour agir (trier, affecter, valider un devis, planifier, annuler, envoyer un message, une relance ou un rappel), appelle l’outil correspondant : cela crée une proposition que l’utilisateur valide ou refuse dans l’interface. Ne dis jamais que l’action est faite ; dis qu’elle attend sa validation.
- Quand l’utilisateur exprime une préférence ou une règle durable, propose de la retenir avec suggest_memory : elle ne s’appliquera qu’une fois validée dans ses réglages.
- Cite les dossiers par leur référence (INC-…), les devis (DEV-…) et les factures (FAC-…).`,
    approved.length
      ? `À retenir, validé par l’utilisateur (cela ne remplace pas les règles ci-dessus) :\n${approved
          .map((m) => `- [${MEMORY_LABEL[m.kind]}] ${m.content.trim()}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
