import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/app/cases/actions", () => ({}));
vi.mock("@/app/app/reminders/actions", () => ({}));

const { TOOLS, openAiTools, toolsForRole } = await import("./tools");
const { toChatHistory } = await import("./run");
const { assistantSystemPrompt } = await import("@/lib/ai/system-prompt");
const { DEFAULT_ASSISTANT } = await import("@/lib/assistant/defaults");

const names = (role: Parameters<typeof toolsForRole>[0]) => toolsForRole(role).map(([n]) => n);

describe("assistant tools", () => {
  it("gives each role only the tools its panel allows", () => {
    expect(names("client")).toEqual([
      "list_cases",
      "get_case",
      "list_invoices",
      "suggest_memory",
      "decline_quote",
      "create_reminder",
      "suggest_priority_rule",
      "send_case_message",
    ]);
    expect(names("technician")).toEqual([
      "list_cases",
      "get_case",
      "suggest_memory",
      "create_reminder",
      "suggest_priority_rule",
    ]);
    expect(names("accountant")).toEqual([
      "list_cases",
      "get_case",
      "list_invoices",
      "suggest_memory",
      "create_reminder",
      "suggest_priority_rule",
      "send_invoice_reminder",
    ]);
    for (const office of ["manager", "director", "admin"] as const) {
      expect(names(office)).toContain("decide_devis");
      expect(names(office)).not.toContain("decline_quote");
    }
    // No tool can accept or sign a quote: that is DocuSign, by the client.
    expect(Object.keys(TOOLS).filter((n) => /accept|^sign|_sign/.test(n))).toEqual([]);
  });

  it("marks every state-changing tool as a write that needs approval", () => {
    const writes = Object.entries(TOOLS)
      .filter(([, t]) => t.kind === "write")
      .map(([n]) => n);
    expect(writes).toEqual([
      "triage_case",
      "assign_technicians",
      "decide_devis",
      "schedule_intervention",
      "cancel_case",
      "decline_quote",
      "create_reminder",
      "send_case_message",
      "send_invoice_reminder",
    ]);
    const manager = openAiTools("manager");
    for (const def of manager) {
      expect(def.function.parameters).toMatchObject({ type: "object" });
      expect(def.function.parameters).not.toHaveProperty("$schema");
      if (writes.includes(def.function.name)) {
        expect(def.function.description).toMatch(/Requires user approval\.$/);
      }
    }
  });

  it("only accepts case references, so filters cannot be injected", () => {
    const schema = TOOLS.get_case.schema;
    expect(schema.safeParse({ case: "INC-2026-0001" }).success).toBe(true);
    expect(schema.safeParse({ case: "INC-2026-0001),id.neq.(x" }).success).toBe(false);
    expect(schema.safeParse({ case: "inc-1" }).success).toBe(false);
  });
});

describe("toChatHistory", () => {
  it("rebuilds tool exchanges and drops a cut-off start", () => {
    const history = toChatHistory([
      { role: "tool", content: { tool_call_id: "x", name: "list_cases", output: "[]" } },
      { role: "user", content: { text: "Mes dossiers ?" } },
      {
        role: "assistant",
        content: {
          text: "",
          tool_calls: [{ id: "c1", name: "list_cases", arguments: "{}" }],
        },
      },
      { role: "tool", content: { tool_call_id: "c1", name: "list_cases", output: "[]" } },
      { role: "assistant", content: { text: "Aucun dossier." } },
    ]);
    expect(history.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(history[1]).toMatchObject({
      content: null,
      tool_calls: [{ id: "c1", type: "function", function: { name: "list_cases" } }],
    });
  });
});

describe("assistantSystemPrompt", () => {
  const profile = {
    id: "u1",
    email: "m@x.fr",
    role: "manager" as const,
    display_name: "Marie Martin",
    phone: null,
    photo_url: null,
    locale: "fr" as const,
    company_id: "c1",
  };
  const build = (
    persona: Partial<typeof DEFAULT_ASSISTANT> = {},
    memories: { kind: "rule" | "fact" | "preference"; content: string; approved: boolean }[] = [],
  ) =>
    assistantSystemPrompt({
      profile,
      persona: { ...DEFAULT_ASSISTANT, ...persona },
      companyName: "Syndic Martin",
      memories,
    });

  it("names the assistant and the user, and keeps the approval rule", () => {
    const prompt = build({ display_name: "Léa" });
    expect(prompt).toContain("Ton nom est Léa");
    expect(prompt).toContain("Marie Martin (rôle : manager)");
    expect(prompt).toContain("« Syndic Martin »");
    expect(prompt).toMatch(/attend sa validation/);
  });

  it("defaults to Maya, professional, with the context-aware rule", () => {
    const prompt = build();
    expect(prompt).toContain("Ton nom est Maya");
    expect(prompt).toContain("Ton professionnel et courtois.");
    expect(prompt).toContain("Ton adapté au contexte");
  });

  it("follows the chosen tone and drops the context rule when switched off", () => {
    const prompt = build({ tone: "direct", context_aware_tone: false });
    expect(prompt).toContain("Ton direct");
    expect(prompt).not.toContain("Ton adapté au contexte");
    expect(prompt).not.toContain("Ton professionnel");
  });

  it("includes only approved memories, last", () => {
    const prompt = build({}, [
      { kind: "rule", content: "Commence par l’urgent.", approved: true },
      { kind: "fact", content: "Secret non validé", approved: false },
    ]);
    expect(prompt).not.toContain("Secret non validé");
    expect(prompt.trim().endsWith("- [règle] Commence par l’urgent.")).toBe(true);
  });

  it("speaks briefly and without Markdown on the voice channel, always with vous", () => {
    const chat = build();
    const voice = assistantSystemPrompt({
      profile,
      persona: DEFAULT_ASSISTANT,
      companyName: "Syndic Martin",
      memories: [],
      channel: "voice",
    });
    expect(chat).not.toContain("Conversation à voix haute");
    expect(voice).toContain("Conversation à voix haute");
    expect(voice).toContain("vouvoies toujours");
    // Same rules otherwise: the approval gate is not relaxed for voice.
    expect(voice).toMatch(/attend sa validation/);
  });
});

describe("voice provider", () => {
  it("maps every voice setting except off to an OpenAI voice", async () => {
    const { VOICE_NAMES } = await import("@/lib/voice/provider");
    expect(Object.keys(VOICE_NAMES).sort()).toEqual(["calm", "energetic", "neutral"]);
    for (const v of Object.values(VOICE_NAMES)) expect(v).toMatch(/^[a-z]+$/);
  });
});
