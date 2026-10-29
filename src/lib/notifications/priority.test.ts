import { describe, expect, it } from "vitest";
import { classify, matches, ruleConditionSchema, suggestFromOverrides } from "./priority";

const item = (over: Partial<Parameters<typeof classify>[0]> = {}) => ({
  type: "quotation",
  source: "system" as const,
  title: "Devis DEV-2026-0004 signé",
  body: "Contrat de maintenance",
  ...over,
});

describe("smart notification priority", () => {
  it("defaults by type", () => {
    expect(classify(item(), [])).toBe("important");
    expect(classify(item({ type: "message" }), [])).toBe("digest");
    expect(classify(item({ type: "reminder" }), [])).toBe("urgent");
    expect(classify(item({ type: "unknown" }), [])).toBe("important");
  });

  it("applies the most specific matching rule", () => {
    const rules = [
      { condition: { type: "quotation" }, priority: "digest" as const },
      { condition: { type: "quotation", keyword: "contrat" }, priority: "urgent" as const },
    ];
    expect(classify(item(), rules)).toBe("urgent");
    expect(classify(item({ body: "Fuite" }), rules)).toBe("digest");
  });

  it("matches keywords without case, and every field it sets", () => {
    expect(matches({ keyword: "CONTRAT" }, item())).toBe(true);
    expect(matches({ keyword: "contrat", source: "email" }, item())).toBe(false);
  });

  it("refuses empty or unknown conditions", () => {
    expect(ruleConditionSchema.safeParse({}).success).toBe(false);
    expect(ruleConditionSchema.safeParse({ sql: "1=1" }).success).toBe(false);
    expect(ruleConditionSchema.safeParse({ type: "invoice" }).success).toBe(true);
  });

  it("suggests a rule after repeated manual moves", () => {
    expect(suggestFromOverrides([{ type: "invoice", priority: "urgent" }])).toBeNull();
    expect(
      suggestFromOverrides([
        { type: "invoice", priority: "urgent" },
        { type: "message", priority: "urgent" },
        { type: "invoice", priority: "urgent" },
      ]),
    ).toEqual({ condition: { type: "invoice" }, priority: "urgent" });
  });
});
