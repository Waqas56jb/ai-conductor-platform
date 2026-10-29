import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/app/cases/actions", () => ({}));

const { TOOLS, openAiTools, toolsForRole } = await import("./tools");
const { systemPrompt, toChatHistory, DEFAULT_AGENT } = await import("./run");

const names = (role: Parameters<typeof toolsForRole>[0]) => toolsForRole(role).map(([n]) => n);

describe("assistant tools", () => {
  it("gives each role only the tools its panel allows", () => {
    expect(names("client")).toEqual([
      "list_cases",
      "get_case",
      "list_invoices",
      "client_decision",
      "send_case_message",
    ]);
    expect(names("technician")).toEqual(["list_cases", "get_case"]);
    expect(names("accountant")).toEqual([
      "list_cases",
      "get_case",
      "list_invoices",
      "send_invoice_reminder",
    ]);
    for (const office of ["manager", "director", "admin"] as const) {
      expect(names(office)).toContain("decide_devis");
      expect(names(office)).not.toContain("client_decision");
    }
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
      "client_decision",
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

describe("systemPrompt", () => {
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

  it("includes the user, the approval rule and personal instructions last", () => {
    const prompt = systemPrompt(
      profile,
      { ...DEFAULT_AGENT, assistant_name: "Léa", instructions: "Commence par l’urgent." },
      "Syndic Martin",
    );
    expect(prompt).toContain("Ton nom est Léa");
    expect(prompt).toContain("Marie Martin (rôle : manager)");
    expect(prompt).toContain("« Syndic Martin »");
    expect(prompt).toMatch(/attend sa validation/);
    expect(prompt.trim().endsWith("Commence par l’urgent.")).toBe(true);
  });
});
