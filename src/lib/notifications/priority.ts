import { z } from "zod";

/** Smart inbox tabs. */
export const PRIORITIES = ["urgent", "important", "digest"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SOURCES = ["email", "call", "meeting", "file", "task", "system"] as const;
export type Source = (typeof SOURCES)[number];

/** A rule matches when every field it sets matches. */
export const ruleConditionSchema = z
  .object({
    type: z.string().trim().min(1).max(40).optional(),
    source: z.enum(SOURCES).optional(),
    keyword: z.string().trim().min(2).max(80).optional(),
  })
  .strict()
  .refine((c) => Object.values(c).some(Boolean), { error: "empty" });
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export type Rule = { condition: RuleCondition; priority: Priority };

type Item = { type: string; source: Source; title: string; body?: string | null };

/** Without a rule: what each kind of notification usually deserves. */
const DEFAULT_PRIORITY: Record<string, Priority> = {
  reminder: "urgent",
  quotation: "important",
  invoice: "important",
  intervention: "important",
  incident: "important",
  assignment: "important",
  message: "digest",
  settings: "digest",
};

export function matches(condition: RuleCondition, item: Item): boolean {
  if (condition.type && condition.type !== item.type) return false;
  if (condition.source && condition.source !== item.source) return false;
  if (condition.keyword) {
    const haystack = `${item.title} ${item.body ?? ""}`.toLocaleLowerCase("fr");
    if (!haystack.includes(condition.keyword.toLocaleLowerCase("fr"))) return false;
  }
  return true;
}

/**
 * Priority of a new notification for one user: their approved rules first
 * (the most specific matching rule wins), then the default for its type.
 */
export function classify(item: Item, rules: readonly Rule[]): Priority {
  const specificity = (r: Rule) => Object.values(r.condition).filter(Boolean).length;
  const hit = rules
    .filter((r) => matches(r.condition, item))
    .sort((a, b) => specificity(b) - specificity(a))[0];
  return hit?.priority ?? DEFAULT_PRIORITY[item.type] ?? "important";
}

/** Manual moves of the same kind before Pratonna suggests making it a rule. */
export const OVERRIDES_BEFORE_SUGGESTION = 2;

/**
 * After the user moved notifications by hand: a rule worth suggesting, if
 * they moved enough of one type to the same priority.
 */
export function suggestFromOverrides(
  overrides: readonly { type: string; priority: Priority }[],
): Rule | null {
  const counts = new Map<string, number>();
  for (const o of overrides) {
    const key = `${o.type}|${o.priority}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, n] of counts) {
    if (n < OVERRIDES_BEFORE_SUGGESTION) continue;
    const [type, priority] = key.split("|") as [string, Priority];
    return { condition: { type }, priority };
  }
  return null;
}
