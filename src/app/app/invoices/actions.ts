"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { paidOf, settle } from "@/lib/accounting/ledger";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import { transition } from "@/lib/cases/transition";
import { PAYMENT_METHODS } from "@/lib/db/types";
import { notify } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Who records payments and reviews receipts. */
const ACCOUNTING = ["accountant", "manager", "director", "admin"];

// Error messages are keys of the "validation" namespace.
const paymentSchema = z.object({
  amount: z.coerce.number({ error: "number" }).gt(0, { error: "positive" }).max(10_000_000),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.iso.date({ error: "required" }),
  reference: z.string().trim().max(120, { error: "tooLong" }),
  notes: z.string().trim().max(500, { error: "tooLong" }),
});
export type PaymentInput = z.input<typeof paymentSchema>;

function refresh(incidentId: string | null) {
  revalidatePath("/app", "layout");
  if (incidentId) revalidatePath(`/app/cases/${incidentId}`);
}

/** The invoice as the caller (RLS), with its payments; accounting roles only. */
async function loadForAccounting(invoiceId: string) {
  const profile = await requireProfile();
  if (!ACCOUNTING.includes(profile.role)) return null;
  const supabase = await createClient();
  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabase.from("ai_conductor_invoices").select("*").eq("id", invoiceId).maybeSingle(),
    supabase.from("ai_conductor_payments").select("amount, status").eq("invoice_id", invoiceId),
  ]);
  return invoice ? { profile, invoice, paid: paidOf(payments ?? []) } : null;
}

/**
 * Records a payment (confirmed in the UI). Several payments can settle one
 * invoice; once nothing remains it is paid and its case closes.
 * `fromReceipt`: the client's proof of payment was checked.
 */
export async function recordPayment(
  invoiceId: string,
  input: PaymentInput,
  fromReceipt = false,
): Promise<Result> {
  const l = await loadForAccounting(invoiceId);
  if (!l) return { ok: false, error: "cases.errors.notFound" };
  const { profile, invoice } = l;
  if (invoice.status === "paid" || invoice.status === "cancelled")
    return { ok: false, error: "cases.errors.invalid_status" };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "invoices.payment.invalid", fieldErrors };
  }
  const p = parsed.data;
  const s = settle(Number(invoice.amount), l.paid, p.amount);
  if (!s.ok)
    return {
      ok: false,
      error: "invoices.payment.tooMuch",
      fieldErrors: { amount: "positive" },
    };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: payment, error } = await admin
    .from("ai_conductor_payments")
    .insert({
      company_id: profile.company_id,
      invoice_id: invoiceId,
      amount: p.amount,
      method: p.method,
      status: "verified",
      reference: p.reference || null,
      // Noon in Paris: the date stays the same whatever the time zone.
      paid_at: `${p.paidAt}T12:00:00+01:00`,
      source: fromReceipt ? "receipt" : "manual",
      notes: p.notes,
      verified_by: profile.id,
      verified_at: now,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !payment) return { ok: false, error: "common.error" };

  // Guarded on the status read above: a concurrent change is not overwritten.
  await admin
    .from("ai_conductor_invoices")
    .update(
      s.fullyPaid
        ? { status: "paid", paid_at: now, receipt_note: "" }
        : { status: "unpaid", receipt_note: "" },
    )
    .eq("id", invoiceId)
    .eq("status", invoice.status);
  await audit(
    profile,
    "invoice.payment",
    { type: "invoice", id: invoiceId },
    { payment_id: payment.id, amount: p.amount, method: p.method, from_receipt: fromReceipt },
  );
  if (s.fullyPaid) {
    await audit(profile, "invoice.paid", { type: "invoice", id: invoiceId });
    if (invoice.incident_id) {
      const { data: incident } = await admin
        .from("ai_conductor_incidents")
        .select("*")
        .eq("id", invoice.incident_id)
        .single();
      if (incident?.status === "invoiced")
        await transition(profile, incident, "close", { role: profile.role, invoicePaid: true });
    }
  }
  await notify({
    companyId: profile.company_id,
    userIds: [invoice.client_id],
    type: "invoice",
    title: s.fullyPaid
      ? `Paiement reçu — ${invoice.reference}`
      : `Paiement partiel reçu — ${invoice.reference}`,
    body: s.fullyPaid
      ? "Merci, votre règlement a bien été enregistré."
      : `${p.amount.toFixed(2)} € reçus, reste ${s.remaining.toFixed(2)} € à régler.`,
    invoiceId,
  });
  refresh(invoice.incident_id);
  revalidatePath("/app/payments");
  return { ok: true };
}

const noteSchema = z.string().trim().min(3).max(500);

/** The client's proof of payment does not match: back to unpaid, with the reason. */
export async function rejectReceipt(invoiceId: string, note: string): Promise<Result> {
  const l = await loadForAccounting(invoiceId);
  if (!l) return { ok: false, error: "cases.errors.notFound" };
  const reason = noteSchema.safeParse(note);
  if (!reason.success)
    return {
      ok: false,
      error: "invoices.receipt.reasonRequired",
      fieldErrors: { note: "required" },
    };
  const { profile, invoice } = l;
  const { data } = await createAdminClient()
    .from("ai_conductor_invoices")
    .update({ status: "unpaid", receipt_note: reason.data })
    .eq("id", invoiceId)
    .eq("status", "under_review")
    .select("id");
  if (!data?.length) return { ok: false, error: "cases.errors.invalid_status" };
  await audit(
    profile,
    "invoice.receipt_rejected",
    { type: "invoice", id: invoiceId },
    {
      note: reason.data,
    },
  );
  await notify({
    companyId: profile.company_id,
    userIds: [invoice.client_id],
    type: "invoice",
    title: `Justificatif refusé — ${invoice.reference}`,
    body: reason.data,
    invoiceId,
  });
  refresh(invoice.incident_id);
  return { ok: true };
}
