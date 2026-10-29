import type { Role } from "@/lib/auth/roles";

/**
 * Unified incident lifecycle (PRATONNA_AUDIT.md §3.2). Every panel, the AI
 * assistant and the voice agent go through `nextStatus` — it is the single
 * authority on who may move a case from where to where.
 *
 *   new → awaiting_assignment → site_visit
 *       → devis_pending_manager (< threshold) | devis_pending_director (≥ threshold)
 *       → sent_to_client → client_signed → intervention_planned → in_progress
 *       → invoiced → closed            (cancelled from any open status)
 */
export const INCIDENT_STATUSES = [
  "new",
  "awaiting_assignment",
  "site_visit",
  "devis_pending_manager",
  "devis_pending_director",
  "sent_to_client",
  "client_signed",
  "intervention_planned",
  "in_progress",
  "invoiced",
  "closed",
  "cancelled",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const FINAL_STATUSES: readonly IncidentStatus[] = ["closed", "cancelled"];

export type IncidentAction =
  | "triage"
  | "assign"
  | "submit_devis"
  | "approve_devis"
  | "reject_devis"
  | "client_accept"
  | "client_decline"
  | "schedule"
  | "start"
  | "complete"
  | "close"
  | "cancel";

/** Facts about the case and the actor that some transitions depend on. */
export type TransitionContext = {
  role: Role;
  /** Actor is one of the technicians assigned to the case. */
  isAssignedTechnician?: boolean;
  /** Actor is the client who reported the case. */
  isReporter?: boolean;
  /** Total of the quote (TTC, EUR) — required for submit_devis. */
  devisAmount?: number;
  /** Company setting: quotes at or above it need the director. */
  approvalThreshold?: number;
  /** The case's invoice is paid — required for close. */
  invoicePaid?: boolean;
};

export type TransitionResult =
  | { ok: true; status: IncidentStatus }
  | { ok: false; reason: "invalid_status" | "forbidden" | "missing_data" | "unpaid" };

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const SENIOR: readonly Role[] = ["director", "admin"];

const allowed = (role: Role, roles: readonly Role[]) => roles.includes(role);

/** Approval route for a quote of `amount` under the company threshold. */
export function approvalRoute(amount: number, threshold: number): "manager" | "director" {
  return amount >= threshold ? "director" : "manager";
}

export function nextStatus(
  current: IncidentStatus,
  action: IncidentAction,
  ctx: TransitionContext,
): TransitionResult {
  const { role } = ctx;
  const fail = (reason: Exclude<TransitionResult, { ok: true }>["reason"]): TransitionResult => ({
    ok: false,
    reason,
  });
  const to = (status: IncidentStatus): TransitionResult => ({ ok: true, status });
  const fieldWorker =
    allowed(role, OFFICE) || (role === "technician" && ctx.isAssignedTechnician === true);

  switch (action) {
    case "triage":
      if (current !== "new") return fail("invalid_status");
      return allowed(role, OFFICE) ? to("awaiting_assignment") : fail("forbidden");

    case "assign":
      if (current !== "new" && current !== "awaiting_assignment") return fail("invalid_status");
      return allowed(role, OFFICE) ? to("site_visit") : fail("forbidden");

    case "submit_devis": {
      if (current !== "site_visit") return fail("invalid_status");
      if (!fieldWorker) return fail("forbidden");
      if (
        ctx.devisAmount === undefined ||
        ctx.approvalThreshold === undefined ||
        ctx.devisAmount <= 0
      ) {
        return fail("missing_data");
      }
      return to(
        approvalRoute(ctx.devisAmount, ctx.approvalThreshold) === "director"
          ? "devis_pending_director"
          : "devis_pending_manager",
      );
    }

    case "approve_devis":
    case "reject_devis": {
      const target = action === "approve_devis" ? "sent_to_client" : "site_visit";
      if (current === "devis_pending_manager")
        return allowed(role, OFFICE) ? to(target) : fail("forbidden");
      if (current === "devis_pending_director")
        return allowed(role, SENIOR) ? to(target) : fail("forbidden");
      return fail("invalid_status");
    }

    case "client_accept":
    case "client_decline":
      if (current !== "sent_to_client") return fail("invalid_status");
      if (role !== "client" || ctx.isReporter !== true) return fail("forbidden");
      // A declined quote goes back to the team for a revised one.
      return to(action === "client_accept" ? "client_signed" : "site_visit");

    case "schedule":
      if (current !== "client_signed" && current !== "intervention_planned")
        return fail("invalid_status");
      return allowed(role, OFFICE) ? to("intervention_planned") : fail("forbidden");

    case "start":
      if (current !== "intervention_planned") return fail("invalid_status");
      return fieldWorker ? to("in_progress") : fail("forbidden");

    case "complete":
      if (current !== "in_progress") return fail("invalid_status");
      return fieldWorker ? to("invoiced") : fail("forbidden");

    case "close":
      if (current !== "invoiced") return fail("invalid_status");
      if (!allowed(role, [...OFFICE, "accountant"])) return fail("forbidden");
      return ctx.invoicePaid ? to("closed") : fail("unpaid");

    case "cancel":
      if (FINAL_STATUSES.includes(current) || current === "invoiced") return fail("invalid_status");
      return allowed(role, OFFICE) ? to("cancelled") : fail("forbidden");
  }
}

/** Actions a role could take on a case right now (for buttons / AI tools). */
export function availableActions(
  current: IncidentStatus,
  ctx: TransitionContext,
): IncidentAction[] {
  const all: IncidentAction[] = [
    "triage",
    "assign",
    "submit_devis",
    "approve_devis",
    "reject_devis",
    "client_accept",
    "client_decline",
    "schedule",
    "start",
    "complete",
    "close",
    "cancel",
  ];
  // Data-dependent actions are offered when the status and role fit; the data
  // itself is collected by the form.
  const probe: TransitionContext = {
    ...ctx,
    devisAmount: 1,
    approvalThreshold: ctx.approvalThreshold ?? 1,
    invoicePaid: true,
  };
  return all.filter((action) => nextStatus(current, action, probe).ok);
}
