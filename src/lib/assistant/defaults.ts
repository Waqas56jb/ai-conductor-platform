import type { AssistantProfileRow, ThemeColor } from "@/lib/db/types";

/** The assistant settings the UI and the prompt use (a profile row minus its keys). */
export type AssistantSettings = Pick<
  AssistantProfileRow,
  | "display_name"
  | "tone"
  | "language"
  | "avatar_type"
  | "avatar_url"
  | "voice"
  | "context_aware_tone"
  | "theme_color"
>;

/** Until a user changes anything, they have no profile row: these apply. */
export const DEFAULT_ASSISTANT: AssistantSettings = {
  display_name: "Maya",
  tone: "professional",
  language: "fr",
  avatar_type: "human",
  avatar_url: null,
  voice: "calm",
  context_aware_tone: true,
  theme_color: null,
};

export const ASSISTANT_COLUMNS =
  "display_name, tone, language, avatar_type, avatar_url, voice, context_aware_tone, theme_color";

/** Workspace colours: the accent and the end of the gradient. White text stays readable on both. */
export const THEME_PRESETS: Record<ThemeColor, { accent: string; accent2: string }> = {
  blue: { accent: "#2f6bff", accent2: "#8b5cf6" },
  ocean: { accent: "#0369a1", accent2: "#0891b2" },
  violet: { accent: "#6d28d9", accent2: "#c026d3" },
  emerald: { accent: "#047857", accent2: "#0e7490" },
  amber: { accent: "#b45309", accent2: "#c2410c" },
  rose: { accent: "#be185d", accent2: "#7c3aed" },
};

/** CSS custom properties for a colour; the gradient, glows and tints derive from these two. */
export function themeVariables(color: ThemeColor): Record<string, string> {
  const { accent, accent2 } = THEME_PRESETS[color];
  return { "--blue": accent, "--violet": accent2 };
}
