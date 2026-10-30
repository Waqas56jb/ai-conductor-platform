import type { Role } from "@/lib/auth/roles";

/**
 * A generic approval chain: an ordered list of steps, each decided by some
 * roles, ending in a final status. Service orders use it today; any document
 * that needs sign-offs in sequence can declare its own chain.
 *
 * - the first step is a `submit` (the author sends the draft on);
 * - an `approve` step can also `reject`, which sends the item back to the
 *   first step with a mandatory note;
 * - a `sign` step completes with an electronic signature;
 * - open items can be cancelled by `cancelRoles`.
 */

export type ChainDecision = "submit" | "approve" | "reject" | "sign" | "cancel";

export type ChainStep<S extends string> = {
  status: S;
  /** How the step is completed. */
  via: "submit" | "approve" | "sign";
  /** Who decides at this step. */
  roles: readonly Role[];
};

export type Chain<S extends string> = {
  steps: readonly ChainStep<S>[];
  /** Reached once the last step is completed. */
  done: S;
  cancelled: S;
  cancelRoles: readonly Role[];
};

export type ChainResult<S extends string> =
  { ok: true; status: S } | { ok: false; reason: "invalid_status" | "forbidden" | "note_required" };

export function decide<S extends string>(
  chain: Chain<S>,
  current: S,
  decision: ChainDecision,
  ctx: { role: Role; note?: string },
): ChainResult<S> {
  const fail = (reason: Exclude<ChainResult<S>, { ok: true }>["reason"]): ChainResult<S> => ({
    ok: false,
    reason,
  });
  const index = chain.steps.findIndex((s) => s.status === current);
  if (index === -1) return fail("invalid_status");
  const step = chain.steps[index];

  if (decision === "cancel")
    return chain.cancelRoles.includes(ctx.role)
      ? { ok: true, status: chain.cancelled }
      : fail("forbidden");

  if (decision === "reject") {
    if (step.via !== "approve") return fail("invalid_status");
    if (!step.roles.includes(ctx.role)) return fail("forbidden");
    if (!ctx.note?.trim()) return fail("note_required");
    return { ok: true, status: chain.steps[0].status };
  }

  if (decision !== step.via) return fail("invalid_status");
  if (!step.roles.includes(ctx.role)) return fail("forbidden");
  return { ok: true, status: chain.steps[index + 1]?.status ?? chain.done };
}

/** The step an item is at, or null once it is done or cancelled. */
export const stepOf = <S extends string>(chain: Chain<S>, status: S) =>
  chain.steps.find((s) => s.status === status) ?? null;

/** Statuses at which `role` has to act (the "waiting for me" lists). */
export const waitingFor = <S extends string>(chain: Chain<S>, role: Role): S[] =>
  chain.steps.filter((s) => s.via !== "submit" && s.roles.includes(role)).map((s) => s.status);
