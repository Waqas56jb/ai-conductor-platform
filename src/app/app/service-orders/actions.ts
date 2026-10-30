"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { esign, sendForSignature } from "@/lib/esign/signatures";
import { notify, usersWithRoles } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decide, stepOf, type ChainDecision } from "@/lib/workflows/approval-chain";
import {
  SERVICE_ORDER_CHAIN,
  serviceOrderSchema,
  serviceOrderTotal,
  type ServiceOrderInput,
  type ServiceOrderStatus,
} from "@/lib/workflows/service-order";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };
type CreateResult = { ok: true; id: string } | Exclude<Result, { ok: true }>;
type SigningResult = { ok: true; url: string; requestId: string } | { ok: false; error: string };

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const ID = /^OS-[A-Z0-9]{4,40}$/;

function refresh(id?: string) {
  revalidatePath("/app", "layout");
  revalidatePath("/app/service-orders");
  if (id) revalidatePath(`/app/service-orders/${id}`);
}

/** Validated columns of the form, or the field errors. */
async function parse(input: ServiceOrderInput) {
  const parsed = serviceOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false as const, error: "serviceOrders.errors.invalid", fieldErrors };
  }
  const o = parsed.data;
  if (o.incidentId) {
    // The case must be one the caller can see in their company.
    const { data: incident } = await (
      await createClient()
    )
      .from("ai_conductor_incidents")
      .select("id")
      .eq("id", o.incidentId)
      .maybeSingle();
    if (!incident)
      return {
        ok: false as const,
        error: "serviceOrders.errors.case",
        fieldErrors: { incidentId: "required" },
      };
  }
  return {
    ok: true as const,
    columns: {
      title: o.title,
      description: o.description,
      supplier_name: o.supplierName,
      supplier_email: o.supplierEmail.toLowerCase(),
      supplier_siret: o.supplierSiret || null,
      incident_id: o.incidentId || null,
      start_date: o.startDate,
      end_date: o.endDate || null,
      amount_ht: Math.round(o.amountHt * 100) / 100,
      tax_rate: o.taxRate,
      total_ttc: serviceOrderTotal(o.amountHt, o.taxRate),
    },
  };
}

/** A draft with the next OS-YYYY-NNNN number of the company (office only). */
export async function createServiceOrder(input: ServiceOrderInput): Promise<CreateResult> {
  const profile = await requireProfile();
  if (!OFFICE.includes(profile.role)) return { ok: false, error: "common.forbidden" };
  const p = await parse(input);
  if (!p.ok) return p;
  const admin = createAdminClient();
  const { data: n, error: numberError } = await admin.rpc("ai_conductor_next_number", {
    company: profile.company_id,
    counter_kind: "ordre_service",
  });
  if (numberError || n === null) return { ok: false, error: "common.error" };
  const reference = `OS-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  const id = `OS-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { error } = await admin.from("ai_conductor_service_orders").insert({
    id,
    reference,
    company_id: profile.company_id,
    ...p.columns,
    created_by: profile.id,
  });
  if (error) return { ok: false, error: "common.error" };
  await audit(profile, "service_order.created", { type: "service_order", id }, { reference });
  refresh();
  return { ok: true, id };
}

/** The order as the caller (RLS: office and accounting only). */
async function load(id: string) {
  const profile = await requireProfile();
  if (!ID.test(id)) return null;
  const { data: order } = await (
    await createClient()
  )
    .from("ai_conductor_service_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return order ? { profile, order } : null;
}

/** A draft (new, or sent back by a refusal) can be corrected by the office. */
export async function updateServiceOrder(id: string, input: ServiceOrderInput): Promise<Result> {
  const l = await load(id);
  if (!l) return { ok: false, error: "serviceOrders.errors.notFound" };
  if (!OFFICE.includes(l.profile.role)) return { ok: false, error: "common.forbidden" };
  const p = await parse(input);
  if (!p.ok) return p;
  const { data } = await createAdminClient()
    .from("ai_conductor_service_orders")
    .update(p.columns)
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (!data?.length) return { ok: false, error: "serviceOrders.errors.status" };
  await audit(l.profile, "service_order.updated", { type: "service_order", id });
  refresh(id);
  return { ok: true };
}

/** Who acts next once an order reaches `status`. */
async function nextDeciders(companyId: string, status: ServiceOrderStatus) {
  const step = stepOf(SERVICE_ORDER_CHAIN, status);
  return step ? usersWithRoles(companyId, step.roles) : [];
}

const NOTICE: Partial<Record<ServiceOrderStatus, (ref: string) => string>> = {
  funds_check: (ref) => `Ordre de service ${ref} : vérifiez les fonds`,
  accountant_review: (ref) => `Ordre de service ${ref} à valider (comptabilité)`,
  esign: (ref) => `Ordre de service ${ref} prêt à signer`,
};

/**
 * One decision of the approval chain (confirmed in the UI): submit, approve,
 * reject (back to draft, with a reason) or cancel. The update is guarded on
 * the status read, so two people deciding at once cannot both succeed.
 */
export async function decideServiceOrder(
  id: string,
  decision: Exclude<ChainDecision, "sign">,
  note = "",
): Promise<Result> {
  const l = await load(id);
  if (!l) return { ok: false, error: "serviceOrders.errors.notFound" };
  const { profile, order } = l;
  const trimmed = note.trim().slice(0, 2000);
  const r = decide(SERVICE_ORDER_CHAIN, order.status, decision, {
    role: profile.role,
    note: trimmed,
  });
  if (!r.ok) return { ok: false, error: `serviceOrders.errors.${r.reason}` };

  const admin = createAdminClient();
  const { data: moved } = await admin
    .from("ai_conductor_service_orders")
    .update({ status: r.status })
    .eq("id", id)
    .eq("status", order.status)
    .select("id");
  if (!moved?.length) return { ok: false, error: "serviceOrders.errors.status" };
  await admin.from("ai_conductor_approval_steps").insert({
    company_id: profile.company_id,
    entity_type: "service_order",
    entity_id: id,
    from_status: order.status,
    to_status: r.status,
    decision,
    actor_id: profile.id,
    actor_role: profile.role,
    note: trimmed,
  });
  await audit(
    profile,
    `service_order.${decision}`,
    { type: "service_order", id },
    { from: order.status, to: r.status, ...(trimmed ? { note: trimmed } : {}) },
  );

  const notice = NOTICE[r.status];
  if (notice)
    await notify({
      companyId: profile.company_id,
      userIds: (await nextDeciders(profile.company_id, r.status)).filter((u) => u !== profile.id),
      type: "service_order",
      title: notice(order.reference),
      body: `${order.title} — ${order.supplier_name} — ${Number(order.total_ttc).toFixed(2)} € TTC`,
    });
  else if (decision === "reject" || decision === "cancel")
    await notify({
      companyId: profile.company_id,
      userIds: [order.created_by].filter((u) => u !== profile.id),
      type: "service_order",
      title:
        decision === "reject"
          ? `Ordre de service ${order.reference} renvoyé en brouillon`
          : `Ordre de service ${order.reference} annulé`,
      body: trimmed || order.title,
    });
  refresh(id);
  return { ok: true };
}

/** The director signs the order with DocuSign; the supplier is copied on the envelope. */
export async function startServiceOrderSigning(id: string): Promise<SigningResult> {
  const provider = esign();
  if (!provider) return { ok: false, error: "quotes.sign.notConfigured" };
  const l = await load(id);
  if (!l) return { ok: false, error: "serviceOrders.errors.notFound" };
  const { profile, order } = l;
  const step = stepOf(SERVICE_ORDER_CHAIN, order.status);
  if (step?.via !== "sign") return { ok: false, error: "serviceOrders.errors.status" };
  if (!step.roles.includes(profile.role)) return { ok: false, error: "common.forbidden" };
  try {
    const supabase = await createClient();
    // Reuse the caller's open envelope (they may have closed the window).
    const { data: open } = await supabase
      .from("ai_conductor_signature_requests")
      .select("id, envelope_id")
      .eq("document_type", "service_order")
      .eq("document_id", id)
      .eq("signer_id", profile.id)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const requestId =
      open?.id ??
      (await sendForSignature(profile, {
        type: "service_order",
        id,
        incident_id: order.incident_id,
        cc: { email: order.supplier_email, name: order.supplier_name },
      }));
    const envelopeId =
      open?.envelope_id ??
      (
        await supabase
          .from("ai_conductor_signature_requests")
          .select("envelope_id")
          .eq("id", requestId)
          .single()
      ).data?.envelope_id;
    if (!envelopeId) return { ok: false, error: "quotes.sign.failed" };
    const url = await provider.signingUrl({
      envelopeId,
      signer: {
        email: profile.email,
        name: profile.display_name || profile.email,
        clientUserId: profile.id,
      },
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/esign/return?r=${requestId}`,
      frameOrigin: new URL(env.NEXT_PUBLIC_APP_URL).origin,
    });
    return { ok: true, url, requestId };
  } catch (e) {
    console.error("[esign] service order signing failed", e);
    return { ok: false, error: "quotes.sign.failed" };
  }
}
