import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/auth/roles";
import { decide, waitingFor } from "./approval-chain";
import { fundsCheck, SERVICE_ORDER_CHAIN as chain, serviceOrderSchema } from "./service-order";

describe("service order approval chain", () => {
  it("walks draft → funds_check → accountant_review → esign → sent", () => {
    expect(decide(chain, "draft", "submit", { role: "manager" })).toEqual({
      ok: true,
      status: "funds_check",
    });
    expect(decide(chain, "funds_check", "approve", { role: "director" })).toEqual({
      ok: true,
      status: "accountant_review",
    });
    expect(decide(chain, "accountant_review", "approve", { role: "accountant" })).toEqual({
      ok: true,
      status: "esign",
    });
    expect(decide(chain, "esign", "sign", { role: "director" })).toEqual({
      ok: true,
      status: "sent",
    });
  });

  it("only lets each step's roles decide", () => {
    for (const role of ["client", "technician", "manager", "accountant"] as const)
      expect(decide(chain, "funds_check", "approve", { role })).toMatchObject({
        reason: "forbidden",
      });
    for (const role of ["client", "technician", "manager", "director"] as const)
      expect(decide(chain, "accountant_review", "approve", { role })).toMatchObject({
        reason: "forbidden",
      });
    expect(decide(chain, "draft", "submit", { role: "accountant" })).toMatchObject({
      reason: "forbidden",
    });
    expect(decide(chain, "esign", "sign", { role: "manager" })).toMatchObject({
      reason: "forbidden",
    });
  });

  it("never skips a step", () => {
    expect(decide(chain, "draft", "approve", { role: "director" })).toMatchObject({
      reason: "invalid_status",
    });
    // A signature step cannot be "approved" by a click.
    expect(decide(chain, "esign", "approve", { role: "director" })).toMatchObject({
      reason: "invalid_status",
    });
    expect(decide(chain, "funds_check", "sign", { role: "director" })).toMatchObject({
      reason: "invalid_status",
    });
  });

  it("sends a refusal back to draft, with a reason", () => {
    expect(decide(chain, "accountant_review", "reject", { role: "accountant" })).toMatchObject({
      reason: "note_required",
    });
    expect(
      decide(chain, "accountant_review", "reject", { role: "accountant", note: "TVA erronée" }),
    ).toEqual({ ok: true, status: "draft" });
    expect(decide(chain, "draft", "reject", { role: "director", note: "x" })).toMatchObject({
      reason: "invalid_status",
    });
  });

  it("lets the office cancel open orders, never finished ones", () => {
    expect(decide(chain, "esign", "cancel", { role: "manager" })).toEqual({
      ok: true,
      status: "cancelled",
    });
    expect(decide(chain, "draft", "cancel", { role: "accountant" })).toMatchObject({
      reason: "forbidden",
    });
    for (const status of ["sent", "cancelled"] as const)
      for (const role of ROLES) expect(decide(chain, status, "cancel", { role }).ok).toBe(false);
  });

  it("knows what waits for each role", () => {
    expect(waitingFor(chain, "director")).toEqual(["funds_check", "esign"]);
    expect(waitingFor(chain, "accountant")).toEqual(["accountant_review"]);
    expect(waitingFor(chain, "admin")).toEqual(["funds_check", "accountant_review", "esign"]);
    expect(waitingFor(chain, "manager")).toEqual([]);
    expect(waitingFor(chain, "client")).toEqual([]);
  });
});

describe("funds check", () => {
  it("compares the order with collected minus committed", () => {
    expect(fundsCheck({ collected: 10000, committed: 2500.5, amount: 3000 })).toEqual({
      collected: 10000,
      committed: 2500.5,
      available: 7499.5,
      after: 4499.5,
      sufficient: true,
    });
    expect(fundsCheck({ collected: 1000, committed: 0, amount: 1200 })).toMatchObject({
      sufficient: false,
      after: -200,
    });
  });
});

describe("service order form", () => {
  const valid = {
    title: "Remplacement colonne d’eau",
    description: "",
    supplierName: "Plomberie Martin",
    supplierEmail: "contact@plomberie-martin.fr",
    supplierSiret: "",
    incidentId: "",
    startDate: "2026-11-02",
    endDate: "",
    amountHt: "1500",
    taxRate: "10",
  };

  it("accepts a complete order", () => {
    expect(serviceOrderSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects bad amounts, SIRET, e-mail and dates", () => {
    const issues = (patch: Partial<typeof valid>) =>
      serviceOrderSchema.safeParse({ ...valid, ...patch }).error?.issues.map((i) => i.message);
    expect(issues({ amountHt: "0" })).toEqual(["positive"]);
    expect(issues({ supplierSiret: "1234" })).toEqual(["siret"]);
    expect(issues({ supplierEmail: "martin" })).toEqual(["email"]);
    expect(issues({ taxRate: "19" })).toEqual(["required"]);
    expect(issues({ endDate: "2026-11-01" })).toEqual(["endBeforeStart"]);
  });
});
