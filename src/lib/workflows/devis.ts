import { z } from "zod";
import type { QuoteLine } from "@/lib/db/types";

/** French standard VAT; renovation work can use 10 % or 5.5 %. */
export const VAT_RATES = [20, 10, 5.5, 0] as const;

const cents = (n: number) => Math.round(n * 100) / 100;

/** Totals in euros, rounded to the cent line by line (as on a printed quote). */
export function computeTotals(lines: readonly QuoteLine[], taxRate: number) {
  const subtotal = cents(lines.reduce((sum, l) => sum + cents(l.quantity * l.unit_price_ht), 0));
  const tax = cents((subtotal * taxRate) / 100);
  return { subtotal_ht: subtotal, tax_amount: tax, total_ttc: cents(subtotal + tax) };
}

// Error messages are keys of the "validation" namespace.
export const quoteLineSchema = z.object({
  label: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
  quantity: z.coerce.number({ error: "number" }).positive({ error: "positive" }).max(100000),
  unit_price_ht: z.coerce.number({ error: "number" }).min(0, { error: "positive" }).max(1_000_000),
});

export const devisSchema = z.object({
  title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
  summary: z.string().trim().max(2000, { error: "tooLong" }),
  diagnosis: z.string().trim().max(4000, { error: "tooLong" }),
  tax_rate: z.coerce
    .number()
    .refine((v) => (VAT_RATES as readonly number[]).includes(v), { error: "required" }),
  lines: z.array(quoteLineSchema).min(1, { error: "linesRequired" }).max(50),
});

export type DevisInput = z.infer<typeof devisSchema>;
