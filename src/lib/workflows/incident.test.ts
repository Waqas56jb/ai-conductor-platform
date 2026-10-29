import { describe, expect, it } from "vitest";
import { approvalRoute, availableActions, nextStatus, type IncidentStatus } from "./incident";

const manager = { role: "manager" } as const;
const director = { role: "director" } as const;

describe("approvalRoute", () => {
  it("routes at or above the threshold to the director", () => {
    expect(approvalRoute(999.99, 1000)).toBe("manager");
    expect(approvalRoute(1000, 1000)).toBe("director");
    expect(approvalRoute(2450, 1000)).toBe("director");
  });
});

describe("nextStatus — happy path", () => {
  it("walks a case from report to close", () => {
    const steps: [
      IncidentStatus,
      Parameters<typeof nextStatus>[1],
      Parameters<typeof nextStatus>[2],
      IncidentStatus,
    ][] = [
      ["new", "triage", manager, "awaiting_assignment"],
      ["awaiting_assignment", "assign", manager, "site_visit"],
      [
        "site_visit",
        "submit_devis",
        {
          role: "technician",
          isAssignedTechnician: true,
          devisAmount: 420,
          approvalThreshold: 1000,
        },
        "devis_pending_manager",
      ],
      ["devis_pending_manager", "approve_devis", manager, "sent_to_client"],
      ["sent_to_client", "client_accept", { role: "client", isReporter: true }, "client_signed"],
      ["client_signed", "schedule", manager, "intervention_planned"],
      [
        "intervention_planned",
        "start",
        { role: "technician", isAssignedTechnician: true },
        "in_progress",
      ],
      ["in_progress", "complete", { role: "technician", isAssignedTechnician: true }, "invoiced"],
      ["invoiced", "close", { role: "accountant", invoicePaid: true }, "closed"],
    ];
    for (const [from, action, ctx, to] of steps) {
      expect(nextStatus(from, action, ctx), `${from} --${action}-->`).toEqual({
        ok: true,
        status: to,
      });
    }
  });
});

describe("nextStatus — rules", () => {
  it("sends large quotes to the director, who alone can approve them", () => {
    const tech = {
      role: "technician" as const,
      isAssignedTechnician: true,
      approvalThreshold: 1000,
    };
    expect(nextStatus("site_visit", "submit_devis", { ...tech, devisAmount: 2450 })).toEqual({
      ok: true,
      status: "devis_pending_director",
    });
    expect(nextStatus("devis_pending_director", "approve_devis", manager)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(nextStatus("devis_pending_director", "approve_devis", director)).toEqual({
      ok: true,
      status: "sent_to_client",
    });
    expect(nextStatus("devis_pending_director", "reject_devis", director)).toEqual({
      ok: true,
      status: "site_visit",
    });
  });

  it("only assigned technicians act in the field", () => {
    expect(nextStatus("intervention_planned", "start", { role: "technician" })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(
      nextStatus("site_visit", "submit_devis", {
        role: "technician",
        devisAmount: 10,
        approvalThreshold: 1000,
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("only the reporting client decides on the quote", () => {
    expect(nextStatus("sent_to_client", "client_accept", { role: "client" })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(nextStatus("sent_to_client", "client_accept", manager)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(
      nextStatus("sent_to_client", "client_decline", { role: "client", isReporter: true }),
    ).toEqual({
      ok: true,
      status: "site_visit",
    });
  });

  it("requires a positive amount and the threshold to submit a quote", () => {
    expect(
      nextStatus("site_visit", "submit_devis", { ...manager, approvalThreshold: 1000 }),
    ).toEqual({
      ok: false,
      reason: "missing_data",
    });
    expect(
      nextStatus("site_visit", "submit_devis", {
        ...manager,
        devisAmount: 0,
        approvalThreshold: 1000,
      }),
    ).toEqual({
      ok: false,
      reason: "missing_data",
    });
  });

  it("closes only paid cases", () => {
    expect(nextStatus("invoiced", "close", { role: "director", invoicePaid: false })).toEqual({
      ok: false,
      reason: "unpaid",
    });
  });

  it("rejects transitions from the wrong status", () => {
    expect(nextStatus("closed", "cancel", manager)).toEqual({
      ok: false,
      reason: "invalid_status",
    });
    expect(nextStatus("invoiced", "cancel", manager)).toEqual({
      ok: false,
      reason: "invalid_status",
    });
    expect(nextStatus("new", "start", manager)).toEqual({ ok: false, reason: "invalid_status" });
  });

  it("never lets clients or accountants run the office workflow", () => {
    for (const role of ["client", "accountant"] as const) {
      expect(nextStatus("new", "triage", { role }).ok).toBe(false);
      expect(nextStatus("awaiting_assignment", "assign", { role }).ok).toBe(false);
      expect(nextStatus("client_signed", "schedule", { role }).ok).toBe(false);
      expect(nextStatus("site_visit", "cancel", { role }).ok).toBe(false);
    }
  });
});

describe("availableActions", () => {
  it("lists what a role can do now", () => {
    expect(availableActions("new", manager)).toEqual(["triage", "assign", "cancel"]);
    expect(availableActions("devis_pending_director", manager)).toEqual(["cancel"]);
    expect(availableActions("devis_pending_director", director)).toEqual([
      "approve_devis",
      "reject_devis",
      "cancel",
    ]);
    expect(availableActions("sent_to_client", { role: "client", isReporter: true })).toEqual([
      "client_accept",
      "client_decline",
    ]);
    expect(
      availableActions("site_visit", { role: "technician", isAssignedTechnician: true }),
    ).toEqual(["submit_devis"]);
  });
});
