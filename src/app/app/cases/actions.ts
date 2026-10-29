"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { draftDevis, type DevisDraft } from "@/lib/ai/devis";
import { audit } from "@/lib/audit";
import { requireProfile } from "@/lib/auth/session";
import type { PhotoRef, Urgency } from "@/lib/db/types";
import { geocode } from "@/lib/geo";
import { notify, usersWithRoles } from "@/lib/notify";
import { filesFrom, PHOTO_BUCKET, RECEIPT_BUCKET, signedUrls, uploadFile } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeTotals, devisSchema, type DevisInput } from "@/lib/workflows/devis";
import { nextStatus, type TransitionContext } from "@/lib/workflows/incident";
import { office, OFFICE_ROLES, transition } from "@/lib/cases/transition";

/** Result of a case action; `error` is a message key. */
export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_PHOTOS = 6;
const PAYMENT_TERMS_DAYS = 30;

const fail = (error: string): ActionResult => ({ ok: false, error });
const year = () => new Date().getFullYear();

function refresh(incidentId?: string) {
  revalidatePath("/app", "layout");
  if (incidentId) revalidatePath(`/app/cases/${incidentId}`);
}

/** Random, globally unique key (URLs, foreign keys). Human numbers live in `reference`. */
const uniqueId = (prefix: string) =>
  `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

async function nextRef(companyId: string, kind: "devis" | "facture" | "incident", prefix: string) {
  const { data, error } = await createAdminClient().rpc("ai_conductor_next_number", {
    company: companyId,
    counter_kind: kind,
  });
  if (error || data === null) throw new Error(`numbering failed: ${error?.message}`);
  return `${prefix}-${year()}-${String(data).padStart(4, "0")}`;
}

/** Loads the case as the caller (RLS proves they may see it) + their role facts. */
async function loadCase(id: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: incident } = await supabase
    .from("ai_conductor_incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!incident) return null;
  const ctx: TransitionContext = {
    role: profile.role,
    isAssignedTechnician: incident.hired_tech_ids.includes(profile.id),
    isReporter: incident.client_id === profile.id,
  };
  return { profile, incident, ctx };
}

// ---------- report ----------

const reportSchema = z.object({
  title: z.string().trim().min(1, { error: "required" }).max(160, { error: "tooLong" }),
  description: z.string().trim().max(4000, { error: "tooLong" }),
  address: z.string().trim().min(3, { error: "required" }).max(240, { error: "tooLong" }),
  unit: z.string().trim().max(80, { error: "tooLong" }),
  city: z.string().trim().max(120, { error: "tooLong" }),
  urgency: z.enum(["low", "medium", "high"], { error: "required" }),
  channel: z.enum(["app", "phone", "email", "whatsapp"]),
  complainant: z.string().trim().max(160, { error: "tooLong" }),
});

export type ReportState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function reportIncident(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const profile = await requireProfile();
  const isClient = profile.role === "client";
  if (!isClient && !OFFICE_ROLES.includes(profile.role as (typeof OFFICE_ROLES)[number])) {
    return { status: "error", message: "cases.errors.forbidden" };
  }

  const raw = Object.fromEntries(
    ["title", "description", "address", "unit", "city", "urgency", "channel", "complainant"].map(
      (k) => [k, String(formData.get(k) ?? "")],
    ),
  );
  const parsed = reportSchema.safeParse({
    ...raw,
    channel: isClient ? "app" : raw.channel || "phone",
  });
  const photos = filesFrom(formData, "photos");
  // Report every problem at once, photos included.
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success)
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
  if (isClient && !photos.length) fieldErrors.photos = "photoRequired";
  if (photos.length > MAX_PHOTOS) fieldErrors.photos = "tooManyPhotos";
  if (!parsed.success || Object.keys(fieldErrors).length)
    return { status: "error", fieldErrors, values: raw };

  const v = parsed.data;
  const id = uniqueId("INC");
  // Independent network calls run together (each is a round-trip to Supabase or the address API).
  const [uploads, point] = await Promise.all([
    Promise.all(photos.map((file) => uploadFile(PHOTO_BUCKET, profile.company_id, id, file))),
    geocode(v.address, v.city),
  ]);
  const failed = uploads.find((r) => "error" in r);
  if (failed && "error" in failed) {
    return { status: "error", fieldErrors: { photos: `upload_${failed.error}` }, values: raw };
  }
  const now = new Date().toISOString();
  const uploaded: PhotoRef[] = uploads.flatMap((r) =>
    "path" in r
      ? [{ path: r.path, kind: "report" as const, uploaded_by: profile.id, at: now }]
      : [],
  );
  // Numbered last, so a failed upload never consumes a case number.
  const reference = await nextRef(profile.company_id, "incident", "INC");
  const { error } = await createAdminClient()
    .from("ai_conductor_incidents")
    .insert({
      id,
      reference,
      company_id: profile.company_id,
      title: v.title,
      description: v.description,
      channel: v.channel,
      status: "new",
      urgency: v.urgency as Urgency,
      client_id: isClient ? profile.id : null,
      complainant_name: isClient ? profile.display_name : v.complainant || null,
      manager_id: isClient ? null : profile.id,
      building_address: point?.label ?? v.address,
      unit_label: v.unit || null,
      city: point?.city ?? v.city,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      photos: uploaded,
    });
  if (error) {
    console.error("reportIncident: insert failed", error.code, error.message);
    return { status: "error", message: "common.error", values: raw };
  }

  const team = (await office(profile.company_id)).filter((uid) => uid !== profile.id);
  await Promise.all([
    audit(profile, "incident.report", { type: "incident", id }, { channel: v.channel }),
    notify({
      companyId: profile.company_id,
      userIds: team,
      type: "incident",
      title: `Nouveau dossier ${reference}`,
      body: v.title,
      incidentId: id,
    }),
  ]);
  refresh();
  redirect(`/app/cases/${id}`);
}

// ---------- triage & assignment ----------

export async function triageCase(id: string, urgency: Urgency): Promise<ActionResult> {
  if (!["low", "medium", "high"].includes(urgency)) return fail("cases.errors.missing_data");
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const r = await transition(c.profile, c.incident, "triage", c.ctx, {
    urgency,
    manager_id: c.profile.id,
  });
  if (!r.ok) return r;
  refresh(id);
  return { ok: true };
}

export async function assignTechnicians(
  id: string,
  technicianIds: string[],
): Promise<ActionResult> {
  const ids = z.array(z.uuid()).min(1).max(6).safeParse(technicianIds);
  if (!ids.success) return fail("cases.errors.pickTechnician");
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");

  // Only active technicians of the same company.
  const admin = createAdminClient();
  const { data: techs } = await admin
    .from("ai_conductor_users")
    .select("id, display_name")
    .eq("company_id", c.profile.company_id)
    .eq("role", "technician")
    .eq("active", true)
    .in("id", ids.data);
  if (!techs || techs.length !== ids.data.length) return fail("cases.errors.pickTechnician");

  const groupId = `GRP-${id}`;
  const r = await transition(c.profile, c.incident, "assign", c.ctx, {
    hired_tech_ids: ids.data,
    manager_id: c.incident.manager_id ?? c.profile.id,
    urgency: c.incident.urgency ?? "medium",
  });
  if (!r.ok) return r;

  await admin.from("ai_conductor_task_groups").upsert({
    id: groupId,
    company_id: c.profile.company_id,
    incident_id: id,
    member_ids: ids.data,
    created_by: c.profile.id,
  });
  // FK incidents.group_id → task_groups: link once the group exists.
  await admin.from("ai_conductor_incidents").update({ group_id: groupId }).eq("id", id);
  await admin.from("ai_conductor_group_messages").insert({
    company_id: c.profile.company_id,
    group_id: groupId,
    from_id: c.profile.id,
    from_name: c.profile.display_name,
    from_role: c.profile.role,
    text: `Équipe constituée : ${techs.map((t) => t.display_name).join(", ")}. Merci d’organiser la visite et d’envoyer le constat.`,
  });
  await notify({
    companyId: c.profile.company_id,
    userIds: ids.data,
    type: "assignment",
    title: `Nouvelle mission ${c.incident.reference}`,
    body: c.incident.title,
    incidentId: id,
  });
  await notify({
    companyId: c.profile.company_id,
    userIds: [c.incident.client_id],
    type: "assignment",
    title: "Un technicien est assigné à votre dossier",
    body: c.incident.title,
    incidentId: id,
  });
  refresh(id);
  return { ok: true };
}

// ---------- site visit ----------

export async function addSitePhotos(id: string, formData: FormData): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const isOffice = OFFICE_ROLES.includes(c.profile.role as (typeof OFFICE_ROLES)[number]);
  if (!isOffice && !c.ctx.isAssignedTechnician) return fail("cases.errors.forbidden");

  const files = filesFrom(formData, "photos");
  if (!files.length) return fail("validation.photoRequired");
  if (c.incident.photos.length + files.length > 20) return fail("validation.tooManyPhotos");
  const added: PhotoRef[] = [];
  for (const file of files) {
    const r = await uploadFile(PHOTO_BUCKET, c.profile.company_id, id, file);
    if ("error" in r) return fail(`validation.upload_${r.error}`);
    added.push({
      path: r.path,
      kind: "site",
      uploaded_by: c.profile.id,
      at: new Date().toISOString(),
    });
  }
  await createAdminClient()
    .from("ai_conductor_incidents")
    .update({ photos: [...c.incident.photos, ...added] })
    .eq("id", id);
  await audit(c.profile, "incident.photos", { type: "incident", id }, { count: added.length });
  refresh(id);
  return { ok: true };
}

/** AI draft of the site report + quote lines (not saved: the technician reviews it). */
export async function generateDevisDraft(
  id: string,
  notes: string,
): Promise<{ ok: true; draft: DevisDraft } | { ok: false; error: string }> {
  const trimmed = notes.trim();
  if (trimmed.length < 10) return { ok: false, error: "cases.errors.notesTooShort" };
  const c = await loadCase(id);
  if (!c) return { ok: false, error: "cases.errors.notFound" };
  // Same permission as submitting the quote.
  const check = nextStatus(c.incident.status, "submit_devis", {
    ...c.ctx,
    devisAmount: 1,
    approvalThreshold: 1,
  });
  if (!check.ok) return { ok: false, error: `cases.errors.${check.reason}` };

  const [urls, { data: settings }] = await Promise.all([
    signedUrls(
      PHOTO_BUCKET,
      c.incident.photos.map((p) => p.path),
    ),
    createAdminClient()
      .from("ai_conductor_settings")
      .select("ai_pricing_note")
      .eq("company_id", c.profile.company_id)
      .maybeSingle(),
  ]);
  try {
    const draft = await draftDevis({
      incidentTitle: c.incident.title,
      description: c.incident.description,
      address: c.incident.building_address ?? "",
      notes: trimmed.slice(0, 4000),
      photoUrls: Object.values(urls),
      pricingNote: settings?.ai_pricing_note ?? undefined,
    });
    await audit(
      c.profile,
      "ai.devis_draft",
      { type: "incident", id },
      { lines: draft.lines.length },
    );
    return { ok: true, draft };
  } catch {
    return { ok: false, error: "cases.errors.aiFailed" };
  }
}

export async function submitDevis(id: string, input: DevisInput): Promise<ActionResult> {
  const parsed = devisSchema.safeParse(input);
  if (!parsed.success) {
    console.warn("submitDevis: invalid input", JSON.stringify(parsed.error.issues.slice(0, 3)));
    return fail(`validation.${parsed.error.issues[0]?.message ?? "required"}`);
  }
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("ai_conductor_settings")
    .select("approval_threshold_eur")
    .eq("company_id", c.profile.company_id)
    .maybeSingle();
  const threshold = Number(settings?.approval_threshold_eur ?? 1000);
  const d = parsed.data;
  const totals = computeTotals(d.lines, d.tax_rate);

  const r = await transition(c.profile, c.incident, "submit_devis", {
    ...c.ctx,
    devisAmount: totals.total_ttc,
    approvalThreshold: threshold,
  });
  if (!r.ok) return r;

  const route = r.status === "devis_pending_director" ? "director" : "manager";
  const quoteId = uniqueId("DEV");
  const reference = await nextRef(c.profile.company_id, "devis", "DEV");
  const { error } = await admin.from("ai_conductor_quotations").insert({
    id: quoteId,
    reference,
    company_id: c.profile.company_id,
    incident_id: id,
    client_id: c.incident.client_id,
    tech_ids: c.incident.hired_tech_ids,
    created_by: c.profile.id,
    created_by_role: c.profile.role,
    title: d.title,
    summary: d.summary,
    diagnosis: d.diagnosis,
    line_items: d.lines,
    tax_rate: d.tax_rate,
    ...totals,
    approval_route: route,
    status: route === "director" ? "pending_director" : "pending_manager",
    threshold_used: threshold,
  });
  if (error) {
    console.error("submitDevis: quote insert failed", error.code, error.message);
    return fail("common.error");
  }
  await admin
    .from("ai_conductor_incidents")
    .update({ quotation_id: quoteId, ai_summary: d.summary })
    .eq("id", id);

  await notify({
    companyId: c.profile.company_id,
    userIds: await usersWithRoles(
      c.profile.company_id,
      route === "director" ? ["director", "admin"] : OFFICE_ROLES,
    ),
    type: "quotation",
    title: `Devis ${reference} à valider`,
    body: `${c.incident.title} — ${totals.total_ttc.toFixed(2)} € TTC`,
    incidentId: id,
    quotationId: quoteId,
  });
  refresh(id);
  return { ok: true };
}

// ---------- approvals & client decision ----------

export async function decideDevis(id: string, approve: boolean): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c?.incident.quotation_id) return fail("cases.errors.notFound");
  const r = await transition(
    c.profile,
    c.incident,
    approve ? "approve_devis" : "reject_devis",
    c.ctx,
  );
  if (!r.ok) return r;
  const { data: quote } = await createAdminClient()
    .from("ai_conductor_quotations")
    .update({ status: approve ? "sent_to_client" : "rejected" })
    .eq("id", c.incident.quotation_id)
    .select("reference")
    .single();
  const ref = quote?.reference ?? "";
  await notify({
    companyId: c.profile.company_id,
    userIds: approve ? [c.incident.client_id] : c.incident.hired_tech_ids,
    type: "quotation",
    title: approve ? `Votre devis ${ref} est prêt` : `Devis ${ref} refusé — à revoir`,
    body: c.incident.title,
    incidentId: id,
    quotationId: c.incident.quotation_id,
  });
  refresh(id);
  return { ok: true };
}

/**
 * The client declines a quote sent to them (confirmed in the UI). Accepting
 * is signing it with DocuSign: see lib/esign/signatures.ts.
 */
export async function declineQuote(id: string): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c?.incident.quotation_id) return fail("cases.errors.notFound");
  const r = await transition(c.profile, c.incident, "client_decline", c.ctx);
  if (!r.ok) return r;
  const { data: quote } = await createAdminClient()
    .from("ai_conductor_quotations")
    .update({ status: "rejected" })
    .eq("id", c.incident.quotation_id)
    .select("reference")
    .single();
  await notify({
    companyId: c.profile.company_id,
    userIds: [...(await office(c.profile.company_id)), ...c.incident.hired_tech_ids],
    type: "quotation",
    title: `Devis ${quote?.reference ?? ""} refusé par le client`,
    body: c.incident.title,
    incidentId: id,
    quotationId: c.incident.quotation_id,
  });
  refresh(id);
  return { ok: true };
}

// ---------- intervention ----------

export async function scheduleIntervention(
  id: string,
  isoDate: string,
  notes: string,
): Promise<ActionResult> {
  const when = new Date(isoDate);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60 * 60 * 1000) {
    return fail("cases.errors.badDate");
  }
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const interventionId = `INT-${id}`;
  const r = await transition(c.profile, c.incident, "schedule", c.ctx);
  if (!r.ok) return r;
  const admin = createAdminClient();
  await admin.from("ai_conductor_interventions").upsert({
    id: interventionId,
    company_id: c.profile.company_id,
    incident_id: id,
    quotation_id: c.incident.quotation_id,
    client_id: c.incident.client_id,
    manager_id: c.profile.id,
    tech_ids: c.incident.hired_tech_ids,
    scheduled_at: when.toISOString(),
    status: "planned",
    building_address: c.incident.building_address,
    notes: notes.trim().slice(0, 1000),
  });
  await admin
    .from("ai_conductor_incidents")
    .update({ intervention_id: interventionId })
    .eq("id", id);
  await notify({
    companyId: c.profile.company_id,
    userIds: [...c.incident.hired_tech_ids, c.incident.client_id],
    type: "intervention",
    title: `Intervention planifiée — ${c.incident.reference}`,
    body: when.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }),
    incidentId: id,
  });
  refresh(id);
  return { ok: true };
}

export async function startIntervention(id: string): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const r = await transition(c.profile, c.incident, "start", c.ctx);
  if (!r.ok) return r;
  if (c.incident.intervention_id) {
    await createAdminClient()
      .from("ai_conductor_interventions")
      .update({ status: "in_progress" })
      .eq("id", c.incident.intervention_id);
  }
  refresh(id);
  return { ok: true };
}

/** Work done → invoice issued from the accepted quote. */
export async function completeIntervention(id: string): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const admin = createAdminClient();
  const { data: quote } = c.incident.quotation_id
    ? await admin
        .from("ai_conductor_quotations")
        .select("title, total_ttc")
        .eq("id", c.incident.quotation_id)
        .maybeSingle()
    : { data: null };
  if (!quote) return fail("cases.errors.missing_data");

  const r = await transition(c.profile, c.incident, "complete", c.ctx);
  if (!r.ok) return r;
  // Numbered only once the transition succeeded: no gaps in the legal invoice sequence.
  const invoiceId = uniqueId("FAC");
  const reference = await nextRef(c.profile.company_id, "facture", "FAC");

  const issued = new Date();
  const due = new Date(issued.getTime() + PAYMENT_TERMS_DAYS * 86400000);
  await admin.from("ai_conductor_invoices").insert({
    id: invoiceId,
    reference,
    company_id: c.profile.company_id,
    incident_id: id,
    quotation_id: c.incident.quotation_id,
    client_id: c.incident.client_id,
    title: quote.title,
    amount: Number(quote.total_ttc),
    status: "unpaid",
    issued_at: issued.toISOString(),
    due_at: due.toISOString(),
  });
  await admin.from("ai_conductor_incidents").update({ invoice_id: invoiceId }).eq("id", id);
  if (c.incident.intervention_id) {
    await admin
      .from("ai_conductor_interventions")
      .update({ status: "completed" })
      .eq("id", c.incident.intervention_id);
  }
  // Technician stats.
  for (const techId of c.incident.hired_tech_ids) {
    const { data: t } = await admin
      .from("ai_conductor_technicians")
      .select("jobs_completed")
      .eq("user_id", techId)
      .maybeSingle();
    if (t)
      await admin
        .from("ai_conductor_technicians")
        .update({ jobs_completed: (t.jobs_completed ?? 0) + 1 })
        .eq("user_id", techId);
  }
  await notify({
    companyId: c.profile.company_id,
    userIds: [
      c.incident.client_id,
      ...(await usersWithRoles(c.profile.company_id, ["accountant", ...OFFICE_ROLES])),
    ],
    type: "invoice",
    title: `Facture ${reference} émise`,
    body: `${quote.title} — ${Number(quote.total_ttc).toFixed(2)} € TTC`,
    incidentId: id,
    invoiceId,
  });
  refresh(id);
  return { ok: true };
}

export async function cancelCase(id: string): Promise<ActionResult> {
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  const r = await transition(c.profile, c.incident, "cancel", c.ctx);
  if (!r.ok) return r;
  await notify({
    companyId: c.profile.company_id,
    userIds: [c.incident.client_id, ...c.incident.hired_tech_ids],
    type: "incident",
    title: `Dossier ${c.incident.reference} annulé`,
    body: c.incident.title,
    incidentId: id,
  });
  refresh(id);
  return { ok: true };
}

// ---------- invoices ----------

async function loadInvoice(invoiceId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("ai_conductor_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  return invoice ? { profile, invoice } : null;
}

export async function uploadReceipt(invoiceId: string, formData: FormData): Promise<ActionResult> {
  const l = await loadInvoice(invoiceId);
  if (!l) return fail("cases.errors.notFound");
  if (l.invoice.client_id !== l.profile.id) return fail("cases.errors.forbidden");
  if (l.invoice.status === "paid") return fail("cases.errors.invalid_status");
  const [file] = filesFrom(formData, "receipt");
  if (!file) return fail("validation.receiptRequired");
  const r = await uploadFile(RECEIPT_BUCKET, l.profile.company_id, invoiceId, file);
  if ("error" in r) return fail(`validation.upload_${r.error}`);

  await createAdminClient()
    .from("ai_conductor_invoices")
    .update({
      receipt_url: r.path,
      receipt_uploaded_at: new Date().toISOString(),
      status: "under_review",
    })
    .eq("id", invoiceId);
  await audit(l.profile, "invoice.receipt", { type: "invoice", id: invoiceId });
  await notify({
    companyId: l.profile.company_id,
    userIds: await usersWithRoles(l.profile.company_id, ["accountant", ...OFFICE_ROLES]),
    type: "invoice",
    title: `Justificatif de paiement reçu — ${l.invoice.reference}`,
    body: l.invoice.title,
    incidentId: l.invoice.incident_id ?? undefined,
    invoiceId,
  });
  refresh(l.invoice.incident_id ?? undefined);
  return { ok: true };
}

/** Payment confirmed: invoice paid, then the case closes. */
export async function markInvoicePaid(invoiceId: string): Promise<ActionResult> {
  const l = await loadInvoice(invoiceId);
  if (!l) return fail("cases.errors.notFound");
  if (!["accountant", ...OFFICE_ROLES].includes(l.profile.role))
    return fail("cases.errors.forbidden");
  if (l.invoice.status === "paid") return fail("cases.errors.invalid_status");

  const admin = createAdminClient();
  await admin
    .from("ai_conductor_invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId);
  await audit(l.profile, "invoice.paid", { type: "invoice", id: invoiceId });

  if (l.invoice.incident_id) {
    const c = await loadCase(l.invoice.incident_id);
    if (c) await transition(c.profile, c.incident, "close", { ...c.ctx, invoicePaid: true });
  }
  await notify({
    companyId: l.profile.company_id,
    userIds: [l.invoice.client_id],
    type: "invoice",
    title: `Paiement reçu — ${l.invoice.reference}`,
    body: "Merci, votre règlement a bien été enregistré.",
    invoiceId,
  });
  refresh(l.invoice.incident_id ?? undefined);
  return { ok: true };
}

export async function sendInvoiceReminder(invoiceId: string): Promise<ActionResult> {
  const l = await loadInvoice(invoiceId);
  if (!l) return fail("cases.errors.notFound");
  if (!["accountant", ...OFFICE_ROLES].includes(l.profile.role))
    return fail("cases.errors.forbidden");
  if (l.invoice.status === "paid") return fail("cases.errors.invalid_status");

  const day = Math.max(
    0,
    Math.floor((Date.now() - new Date(l.invoice.issued_at).getTime()) / 86400000),
  );
  await createAdminClient()
    .from("ai_conductor_invoices")
    .update({ reminders: [...l.invoice.reminders, { day, sent_at: new Date().toISOString() }] })
    .eq("id", invoiceId);
  await audit(l.profile, "invoice.reminder", { type: "invoice", id: invoiceId }, { day });
  await notify({
    companyId: l.profile.company_id,
    userIds: [l.invoice.client_id],
    type: "invoice",
    title: `Rappel : facture ${l.invoice.reference}`,
    body: `${l.invoice.title} — ${Number(l.invoice.amount).toFixed(2)} € TTC`,
    invoiceId,
  });
  refresh(l.invoice.incident_id ?? undefined);
  return { ok: true };
}

// ---------- chats ----------

const messageSchema = z.string().trim().min(1).max(2000);

/** Client ↔ team thread of a case. */
export async function sendCaseMessage(id: string, text: string): Promise<ActionResult> {
  const body = messageSchema.safeParse(text);
  if (!body.success) return fail("validation.required");
  const c = await loadCase(id);
  if (!c) return fail("cases.errors.notFound");
  await createAdminClient().from("ai_conductor_incident_messages").insert({
    company_id: c.profile.company_id,
    incident_id: id,
    from_id: c.profile.id,
    from_name: c.profile.display_name,
    from_role: c.profile.role,
    text: body.data,
  });
  const recipients =
    c.profile.role === "client"
      ? [c.incident.manager_id, ...c.incident.hired_tech_ids]
      : [c.incident.client_id];
  await notify({
    companyId: c.profile.company_id,
    userIds: recipients,
    type: "message",
    title: `Nouveau message — ${c.incident.reference}`,
    body: body.data.slice(0, 140),
    incidentId: id,
  });
  revalidatePath(`/app/cases/${id}`);
  return { ok: true };
}

/** Team-only group chat of a case. */
export async function sendGroupMessage(id: string, text: string): Promise<ActionResult> {
  const body = messageSchema.safeParse(text);
  if (!body.success) return fail("validation.required");
  const c = await loadCase(id);
  if (!c?.incident.group_id) return fail("cases.errors.notFound");
  const isOffice = OFFICE_ROLES.includes(c.profile.role as (typeof OFFICE_ROLES)[number]);
  if (!isOffice && !c.ctx.isAssignedTechnician) return fail("cases.errors.forbidden");
  await createAdminClient().from("ai_conductor_group_messages").insert({
    company_id: c.profile.company_id,
    group_id: c.incident.group_id,
    from_id: c.profile.id,
    from_name: c.profile.display_name,
    from_role: c.profile.role,
    text: body.data,
  });
  revalidatePath(`/app/cases/${id}`);
  return { ok: true };
}
