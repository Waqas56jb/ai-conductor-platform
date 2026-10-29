import "server-only";
import { z } from "zod";
import type { Role } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/session";
import { getCaseDetail, listCases, listTechnicians } from "@/lib/cases/queries";
import { MEMORY_KINDS } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INCIDENT_STATUSES } from "@/lib/workflows/incident";
import {
  assignTechnicians,
  cancelCase,
  clientDecision,
  decideDevis,
  scheduleIntervention,
  sendCaseMessage,
  sendInvoiceReminder,
  triageCase,
  type ActionResult,
} from "@/app/app/cases/actions";

/**
 * Tools the assistant can call. Read tools run immediately as the user (RLS
 * decides what they see). Write tools never run from the model: they become a
 * pending proposal the user approves, then run through the same server actions
 * as the panels, which re-check the role and the state machine.
 */

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const STAFF: readonly Role[] = [...OFFICE, "accountant"];
const EVERYONE: readonly Role[] = ["client", "technician", ...STAFF];

/** Case id (INC-3F2A…) or per-company reference (INC-2026-0001). */
const caseRef = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}-[A-Z0-9-]{4,40}$/, "case reference like INC-2026-0001")
  .describe("Case reference (INC-2026-0001) or id");

type Translate = (key: string, values?: Record<string, string>) => string;

type ReadTool = {
  kind: "read";
  description: string;
  roles: readonly Role[];
  schema: z.ZodType;
  run: (input: never, profile: Profile) => Promise<unknown>;
};

type WriteTool = {
  kind: "write";
  description: string;
  roles: readonly Role[];
  schema: z.ZodType;
  /** Human summary of the proposal, shown on the approval card. */
  describe: (input: never, t: Translate) => string;
  execute: (input: never) => Promise<ActionResult>;
};

export type AssistantTool = ReadTool | WriteTool;

/** Resolves a reference or id to the case id, if the user can see it. */
async function resolveCase(ref: string): Promise<{ id: string; reference: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conductor_incidents")
    .select("id, reference")
    .or(`id.eq.${ref},reference.eq.${ref}`)
    .maybeSingle();
  return data;
}

const notFound = (ref: string) => ({ error: `No visible case ${ref}` });

async function withCase(
  ref: string,
  run: (id: string) => Promise<ActionResult>,
): Promise<ActionResult> {
  const found = await resolveCase(ref);
  return found ? run(found.id) : { ok: false, error: "cases.errors.notFound" };
}

const tool = <S extends z.ZodType>(
  t: Omit<ReadTool, "schema" | "run"> & {
    schema: S;
    run: (input: z.infer<S>, profile: Profile) => Promise<unknown>;
  },
): ReadTool => t as ReadTool;

const action = <S extends z.ZodType>(
  t: Omit<WriteTool, "schema" | "describe" | "execute"> & {
    schema: S;
    describe: (input: z.infer<S>, t: Translate) => string;
    execute: (input: z.infer<S>) => Promise<ActionResult>;
  },
): WriteTool => t as WriteTool;

export const TOOLS: Record<string, AssistantTool> = {
  list_cases: tool({
    kind: "read",
    description:
      "List the cases (incidents) the user can see, newest first. Optionally filter by status.",
    roles: EVERYONE,
    schema: z.object({
      statuses: z.array(z.enum(INCIDENT_STATUSES)).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    run: async ({ statuses, limit }) =>
      (await listCases({ statuses })).slice(0, limit ?? 20).map((c) => ({
        reference: c.reference,
        title: c.title,
        status: c.status,
        urgency: c.urgency,
        city: c.city,
        address: c.building_address,
        reported_by: c.complainant_name,
        created_at: c.created_at,
      })),
  }),

  get_case: tool({
    kind: "read",
    description:
      "Full details of one case: description, status, quote with lines and totals, planned intervention, invoice and the latest messages.",
    roles: EVERYONE,
    schema: z.object({ case: caseRef }),
    run: async ({ case: ref }) => {
      const found = await resolveCase(ref);
      const detail = found && (await getCaseDetail(found.id));
      if (!detail) return notFound(ref);
      const { incident, quote, intervention, invoice, people } = detail;
      const name = (id: string | null) => (id ? (people.get(id)?.display_name ?? null) : null);
      return {
        reference: incident.reference,
        title: incident.title,
        description: incident.description,
        status: incident.status,
        urgency: incident.urgency,
        address: [incident.building_address, incident.unit_label, incident.city]
          .filter(Boolean)
          .join(", "),
        client: incident.complainant_name ?? name(incident.client_id),
        technicians: incident.hired_tech_ids.map(name),
        created_at: incident.created_at,
        quote: quote && {
          reference: quote.reference,
          status: quote.status,
          title: quote.title,
          lines: quote.line_items,
          subtotal_ht: quote.subtotal_ht,
          tax_rate: quote.tax_rate,
          total_ttc: quote.total_ttc,
        },
        intervention: intervention && {
          scheduled_at: intervention.scheduled_at,
          status: intervention.status,
          notes: intervention.notes,
        },
        invoice: invoice && {
          reference: invoice.reference,
          amount: invoice.amount,
          status: invoice.status,
          due_at: invoice.due_at,
        },
        latest_messages: detail.caseMessages.slice(-10).map((m) => ({
          from: m.from_name,
          text: m.text,
          at: m.created_at,
        })),
      };
    },
  }),

  list_technicians: tool({
    kind: "read",
    description:
      "Technicians of the company with id, specialty, city, rating and availability (needed to assign).",
    roles: OFFICE,
    schema: z.object({}),
    run: async () =>
      (await listTechnicians()).map((t) => ({
        id: t.id,
        name: t.display_name,
        specialty: t.specialty,
        city: t.city,
        rating: t.rating,
        jobs_completed: t.jobs_completed,
        available: t.available,
      })),
  }),

  list_invoices: tool({
    kind: "read",
    description: "Invoices the user can see, with amount, status and due date.",
    roles: ["client", ...STAFF],
    schema: z.object({
      status: z.enum(["unpaid", "under_review", "paid", "overdue", "cancelled"]).optional(),
    }),
    run: async ({ status }) => {
      const supabase = await createClient();
      let query = supabase
        .from("ai_conductor_invoices")
        .select("reference, title, amount, status, issued_at, due_at, paid_at")
        .order("issued_at", { ascending: false })
        .limit(50);
      if (status) query = query.eq("status", status);
      const { data } = await query;
      return data ?? [];
    },
  }),

  // Not a business action: it only stores a suggestion, used once the user approves it.
  suggest_memory: tool({
    kind: "read",
    description:
      "Suggest remembering a lasting preference, rule or fact the user stated (e.g. “always address clients formally”). Saved as a suggestion the user approves in their assistant settings; it is not used before.",
    roles: EVERYONE,
    schema: z.object({
      kind: z.enum(MEMORY_KINDS),
      content: z.string().trim().min(3).max(500),
    }),
    run: async ({ kind, content }, profile) => {
      const { error } = await createAdminClient().from("ai_conductor_assistant_memories").insert({
        user_id: profile.id,
        company_id: profile.company_id,
        kind,
        content,
        approved: false,
        source: "assistant",
      });
      return error
        ? { error: "Suggestion not saved" }
        : { status: "suggested_pending_user_approval" };
    },
  }),

  triage_case: action({
    kind: "write",
    description: "Propose to set the urgency of a new case (moves it to awaiting assignment).",
    roles: OFFICE,
    schema: z.object({ case: caseRef, urgency: z.enum(["low", "medium", "high"]) }),
    describe: (i, t) => t("triage", { case: i.case, urgency: t(`urgency.${i.urgency}`) }),
    execute: (i) => withCase(i.case, (id) => triageCase(id, i.urgency)),
  }),

  assign_technicians: action({
    kind: "write",
    description:
      "Propose to assign technicians (ids from list_technicians) to a case for the site visit.",
    roles: OFFICE,
    schema: z.object({
      case: caseRef,
      technician_ids: z.array(z.uuid()).min(1).max(6),
      technician_names: z.array(z.string().max(100)).max(6).describe("Names, for the summary"),
    }),
    describe: (i, t) => t("assign", { case: i.case, names: i.technician_names.join(", ") || "—" }),
    execute: (i) => withCase(i.case, (id) => assignTechnicians(id, i.technician_ids)),
  }),

  decide_devis: action({
    kind: "write",
    description:
      "Propose to approve (send to the client) or reject (back to the technician) a quote awaiting approval.",
    roles: OFFICE,
    schema: z.object({ case: caseRef, approve: z.boolean() }),
    describe: (i, t) => t(i.approve ? "approveDevis" : "rejectDevis", { case: i.case }),
    execute: (i) => withCase(i.case, (id) => decideDevis(id, i.approve)),
  }),

  schedule_intervention: action({
    kind: "write",
    description: "Propose a date and time for the intervention of a signed case.",
    roles: OFFICE,
    schema: z.object({
      case: caseRef,
      starts_at: z.iso.datetime({ offset: true }).describe("ISO 8601 with offset, Europe/Paris"),
      notes: z.string().max(500).optional(),
    }),
    describe: (i, t) =>
      t("schedule", {
        case: i.case,
        date: new Date(i.starts_at).toLocaleString("fr-FR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/Paris",
        }),
      }),
    execute: (i) => withCase(i.case, (id) => scheduleIntervention(id, i.starts_at, i.notes ?? "")),
  }),

  cancel_case: action({
    kind: "write",
    description: "Propose to cancel a case that is not invoiced yet.",
    roles: OFFICE,
    schema: z.object({ case: caseRef }),
    describe: (i, t) => t("cancel", { case: i.case }),
    execute: (i) => withCase(i.case, (id) => cancelCase(id)),
  }),

  client_decision: action({
    kind: "write",
    description: "Client only: propose to accept (sign) or decline the quote sent for a case.",
    roles: ["client"],
    schema: z.object({ case: caseRef, accept: z.boolean() }),
    describe: (i, t) => t(i.accept ? "acceptQuote" : "declineQuote", { case: i.case }),
    execute: (i) => withCase(i.case, (id) => clientDecision(id, i.accept)),
  }),

  send_case_message: action({
    kind: "write",
    description:
      "Propose to post a message in the case conversation (seen by the client and the team).",
    roles: ["client", ...OFFICE],
    schema: z.object({ case: caseRef, text: z.string().trim().min(1).max(2000) }),
    describe: (i, t) => t("message", { case: i.case, text: i.text }),
    execute: (i) => withCase(i.case, (id) => sendCaseMessage(id, i.text)),
  }),

  send_invoice_reminder: action({
    kind: "write",
    description: "Propose to send a payment reminder for an unpaid invoice (FAC-… reference).",
    roles: STAFF,
    schema: z.object({
      invoice: z
        .string()
        .trim()
        .regex(/^FAC-[A-Z0-9-]{4,40}$/),
    }),
    describe: (i, t) => t("reminder", { invoice: i.invoice }),
    execute: async (i) => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("ai_conductor_invoices")
        .select("id")
        .or(`id.eq.${i.invoice},reference.eq.${i.invoice}`)
        .maybeSingle();
      return data ? sendInvoiceReminder(data.id) : { ok: false, error: "cases.errors.notFound" };
    },
  }),
};

export function toolsForRole(role: Role): [string, AssistantTool][] {
  return Object.entries(TOOLS).filter(([, t]) => t.roles.includes(role));
}

/** OpenAI function definitions for the tools this role may use. */
export function openAiTools(role: Role) {
  return toolsForRole(role).map(([name, t]) => {
    const parameters = z.toJSONSchema(t.schema) as Record<string, unknown>;
    delete parameters.$schema;
    return {
      type: "function" as const,
      function: {
        name,
        description:
          t.kind === "write" ? `${t.description} Requires user approval.` : t.description,
        parameters,
      },
    };
  });
}
