import { describe, expect, it } from "vitest";
import { recommend } from "./recommendations";

const now = new Date("2026-10-30T10:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const base = {
  now,
  meId: "me",
  quotes: [
    { reference: "DEV-2026-0001", status: "sent_to_client", updated_at: daysAgo(10) },
    { reference: "DEV-2026-0002", status: "sent_to_client", updated_at: daysAgo(2) },
    { reference: "DEV-2026-0003", status: "accepted", updated_at: daysAgo(30) },
  ],
  invoices: [
    { reference: "FAC-2026-0001", status: "unpaid", due_at: daysAgo(5), reminders: [] },
    {
      reference: "FAC-2026-0002",
      status: "overdue",
      due_at: daysAgo(20),
      reminders: [{ sent_at: daysAgo(2) }],
    },
    { reference: "FAC-2026-0003", status: "paid", due_at: daysAgo(20), reminders: [] },
    { reference: "FAC-2026-0004", status: "unpaid", due_at: daysAgo(-3), reminders: [] },
  ],
  cases: [
    { reference: "INC-2026-0001", status: "new", created_at: daysAgo(2) },
    { reference: "INC-2026-0002", status: "new", created_at: daysAgo(0.1) },
  ],
  tasks: [
    { title: "Rappeler le syndic", status: "todo", due_at: daysAgo(1), assignee_id: "me" },
    { title: "Pas à moi", status: "todo", due_at: daysAgo(1), assignee_id: "other" },
    { title: "Faite", status: "done", due_at: daysAgo(1), assignee_id: "me" },
  ],
};

describe("recommendations", () => {
  it("gives the office every nudge, with a concrete example", () => {
    expect(recommend({ ...base, role: "manager" })).toEqual([
      { key: "quoteFollowUp", count: 1, example: "DEV-2026-0001" },
      { key: "triage", count: 1, example: "INC-2026-0001" },
      { key: "invoiceReminder", count: 1, example: "FAC-2026-0001" },
      { key: "lateTask", count: 1, example: "Rappeler le syndic" },
    ]);
  });

  it("gives each role only what it can act on", () => {
    expect(recommend({ ...base, role: "accountant" }).map((r) => r.key)).toEqual([
      "invoiceReminder",
      "lateTask",
    ]);
    expect(recommend({ ...base, role: "technician" }).map((r) => r.key)).toEqual(["lateTask"]);
    expect(recommend({ ...base, role: "client" })).toEqual([]);
  });

  it("stays quiet when everything is under control", () => {
    expect(
      recommend({ ...base, role: "manager", quotes: [], invoices: [], cases: [], tasks: [] }),
    ).toEqual([]);
  });
});
