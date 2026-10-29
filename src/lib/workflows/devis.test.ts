import { describe, expect, it } from "vitest";
import { computeTotals, devisSchema } from "./devis";

describe("computeTotals", () => {
  it("adds lines and VAT, rounded to the cent", () => {
    expect(
      computeTotals(
        [
          { label: "Diagnostic", quantity: 1, unit_price_ht: 180 },
          { label: "Main d’œuvre", quantity: 3.5, unit_price_ht: 55 },
          { label: "Joint", quantity: 3, unit_price_ht: 0.333 },
        ],
        20,
      ),
    ).toEqual({ subtotal_ht: 373.5, tax_amount: 74.7, total_ttc: 448.2 });
  });

  it("supports reduced VAT and empty quotes", () => {
    expect(computeTotals([{ label: "x", quantity: 1, unit_price_ht: 100 }], 5.5)).toEqual({
      subtotal_ht: 100,
      tax_amount: 5.5,
      total_ttc: 105.5,
    });
    expect(computeTotals([], 20)).toEqual({ subtotal_ht: 0, tax_amount: 0, total_ttc: 0 });
  });
});

describe("devisSchema", () => {
  const base = { title: "Fuite", summary: "", diagnosis: "", tax_rate: "20" };

  it("coerces form strings and requires at least one line", () => {
    const r = devisSchema.parse({
      ...base,
      lines: [{ label: "Joint", quantity: "2", unit_price_ht: "12.5" }],
    });
    expect(r.lines[0]).toEqual({ label: "Joint", quantity: 2, unit_price_ht: 12.5 });
    expect(r.tax_rate).toBe(20);
    expect(devisSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
  });

  it("rejects a VAT rate that does not exist", () => {
    expect(
      devisSchema.safeParse({
        ...base,
        tax_rate: "19",
        lines: [{ label: "x", quantity: 1, unit_price_ht: 1 }],
      }).success,
    ).toBe(false);
  });
});
