import type { Role } from "@/lib/auth/roles";

/**
 * Proactive suggestions on the dashboard, computed from the user's own data
 * (what RLS lets them see). Each one can be handed to the assistant.
 */
export type Recommendation = {
  key: "quoteFollowUp" | "invoiceReminder" | "triage" | "lateTask";
  count: number;
  /** One example (reference or title), to make the suggestion concrete. */
  example: string;
};

const DAY = 86_400_000;
/** A quote with no answer after this deserves a nudge. */
export const QUOTE_FOLLOW_UP_DAYS = 7;
/** Time between two reminders for the same unpaid invoice. */
export const REMINDER_INTERVAL_DAYS = 7;
/** A new case should be triaged within this. */
export const TRIAGE_HOURS = 24;

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const STAFF: readonly Role[] = [...OFFICE, "accountant"];

type Input = {
  now: Date;
  role: Role;
  meId: string;
  quotes: { reference: string; status: string; updated_at: string }[];
  invoices: {
    reference: string | null;
    status: string;
    due_at: string | null;
    reminders: { sent_at: string }[];
  }[];
  cases: { reference: string; status: string; created_at: string }[];
  tasks: { title: string; status: string; due_at: string | null; assignee_id: string | null }[];
};

export function recommend(input: Input): Recommendation[] {
  const { now, role } = input;
  const before = (iso: string, ms: number) => new Date(iso).getTime() < now.getTime() - ms;
  const out: Recommendation[] = [];
  const add = (key: Recommendation["key"], items: string[]) => {
    if (items.length) out.push({ key, count: items.length, example: items[0] });
  };

  if (OFFICE.includes(role)) {
    add(
      "quoteFollowUp",
      input.quotes
        .filter(
          (q) => q.status === "sent_to_client" && before(q.updated_at, QUOTE_FOLLOW_UP_DAYS * DAY),
        )
        .map((q) => q.reference),
    );
    add(
      "triage",
      input.cases
        .filter((c) => c.status === "new" && before(c.created_at, TRIAGE_HOURS * 3_600_000))
        .map((c) => c.reference),
    );
  }
  if (STAFF.includes(role)) {
    add(
      "invoiceReminder",
      input.invoices
        .filter((i) => {
          if (i.status === "paid" || i.status === "cancelled" || !i.due_at) return false;
          if (new Date(i.due_at) >= now) return false;
          const last = i.reminders
            .map((r) => new Date(r.sent_at).getTime())
            .sort((a, b) => b - a)[0];
          return !last || last < now.getTime() - REMINDER_INTERVAL_DAYS * DAY;
        })
        .map((i) => i.reference ?? ""),
    );
  }
  if (role !== "client") {
    add(
      "lateTask",
      input.tasks
        .filter(
          (t) =>
            t.assignee_id === input.meId &&
            t.status !== "done" &&
            t.due_at &&
            new Date(t.due_at) < now,
        )
        .map((t) => t.title),
    );
  }
  return out;
}
