import { z } from "zod";
import type { Role } from "@/lib/auth/roles";
import type { ServiceOrderRow } from "@/lib/db/types";
import type { Chain } from "./approval-chain";
import { VAT_RATES } from "./devis";

/**
 * Service order (ordre de service): the company orders work from a supplier.
 *
 *   draft → funds_check → accountant_review → esign → sent      (cancelled from any open step)
 *
 * The office drafts it; the director checks the funds are there; the
 * accountant reviews it; the director signs it with DocuSign, and DocuSign
 * sends the signed order to the supplier. A refusal sends it back to draft.
 */
export type ServiceOrderStatus = ServiceOrderRow["status"];

export const SERVICE_ORDER_STATUSES = [
  "draft",
  "funds_check",
  "accountant_review",
  "esign",
  "sent",
  "cancelled",
] as const satisfies readonly ServiceOrderStatus[];

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const SENIOR: readonly Role[] = ["director", "admin"];

export const SERVICE_ORDER_CHAIN: Chain<ServiceOrderStatus> = {
  steps: [
    { status: "draft", via: "submit", roles: OFFICE },
    { status: "funds_check", via: "approve", roles: SENIOR },
    // Admin as well, so a company without an accountant is never stuck.
    { status: "accountant_review", via: "approve", roles: ["accountant", "admin"] },
    { status: "esign", via: "sign", roles: SENIOR },
  ],
  done: "sent",
  cancelled: "cancelled",
  cancelRoles: OFFICE,
};

/** Who reads and works on service orders. */
export const SERVICE_ORDER_ROLES: readonly Role[] = [...OFFICE, "accountant"];

const cents = (n: number) => Math.round(n * 100) / 100;

// Error messages are keys of the "validation" namespace.
export const serviceOrderSchema = z
  .object({
    title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
    description: z.string().trim().max(8000, { error: "tooLong" }),
    supplierName: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
    supplierEmail: z.email({ error: "email" }),
    supplierSiret: z
      .string()
      .trim()
      .regex(/^(\d{14})?$/, { error: "siret" }),
    incidentId: z.string().trim().max(60),
    startDate: z.iso.date({ error: "required" }),
    endDate: z.iso.date().or(z.literal("")),
    amountHt: z.coerce.number({ error: "number" }).gt(0, { error: "positive" }).max(10_000_000),
    taxRate: z.coerce
      .number()
      .refine((v) => (VAT_RATES as readonly number[]).includes(v), { error: "required" }),
  })
  .refine((o) => !o.endDate || o.endDate >= o.startDate, {
    error: "endBeforeStart",
    path: ["endDate"],
  });
export type ServiceOrderInput = z.input<typeof serviceOrderSchema>;

export const serviceOrderTotal = (amountHt: number, taxRate: number) =>
  cents(amountHt * (1 + taxRate / 100));

/**
 * The funds check: what was collected this year (verified payments) minus
 * what is already committed (orders past the funds check), against this order.
 */
export function fundsCheck(input: { collected: number; committed: number; amount: number }) {
  const available = cents(input.collected - input.committed);
  return {
    collected: cents(input.collected),
    committed: cents(input.committed),
    available,
    after: cents(available - input.amount),
    sufficient: available >= input.amount,
  };
}

/** Orders whose amount counts as committed in the funds check. */
export const COMMITTED_STATUSES: readonly ServiceOrderStatus[] = [
  "accountant_review",
  "esign",
  "sent",
];
