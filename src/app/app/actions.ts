"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/i18n/config";
import { COMPANY_ADMIN_ROLES } from "@/lib/auth/roles";
import { requireProfile, requireRole } from "@/lib/auth/session";
import { formValues, type FormState } from "@/lib/forms";
import { audit } from "@/lib/audit";
import { reverseGeocode } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/errors";
import { companySchema, profileSchema } from "@/lib/validation/account";

export async function markAllNotificationsRead(): Promise<void> {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("ai_conductor_notifications")
    .update({ read: true })
    .eq("user_id", profile.id)
    .eq("read", false);
  revalidatePath("/app", "layout");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const values = formValues(formData, ["displayName", "phone", "locale"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conductor_users")
    .update({
      display_name: parsed.data.displayName,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
    })
    .eq("id", profile.id);
  if (error) return { status: "error", message: "common.error", values };

  (await cookies()).set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/app", "layout");
  return { status: "success", message: "common.saved" };
}

const COMPANY_FIELDS = [
  "name",
  "legalForm",
  "siret",
  "vatNumber",
  "address",
  "postalCode",
  "city",
  "country",
  "phone",
  "email",
] as const;

export async function updateCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireRole(COMPANY_ADMIN_ROLES);
  const values = formValues(formData, COMPANY_FIELDS);
  const parsed = companySchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const c = parsed.data;

  // RLS also enforces: own company only, director/admin only.
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conductor_companies")
    .update({
      name: c.name,
      legal_form: c.legalForm || null,
      siret: c.siret || null,
      vat_number: c.vatNumber || null,
      address: c.address,
      postal_code: c.postalCode,
      city: c.city,
      country: c.country,
      phone: c.phone || null,
      email: c.email || null,
    })
    .eq("id", profile.company_id);
  if (error) return { status: "error", message: "common.error", values };

  revalidatePath("/app", "layout");
  return { status: "success", message: "common.saved", values };
}

// ---------- support ----------

const feedbackSchema = z.object({
  topic: z.enum(["service", "technician", "billing", "app"], { error: "required" }),
  rating: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().min(1, { error: "required" }).max(2000, { error: "tooLong" }),
});

export async function submitFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const values = formValues(formData, ["topic", "rating", "message"]);
  const parsed = feedbackSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { error } = await createAdminClient()
    .from("ai_conductor_feedback")
    .insert({
      company_id: profile.company_id,
      user_id: profile.id,
      role: profile.role,
      ...parsed.data,
    });
  if (error) return { status: "error", message: "common.error", values };
  revalidatePath("/app/support");
  return { status: "success", message: "support.thanks" };
}

// ---------- technician field profile ----------

const techSchema = z.object({
  specialty: z.string().trim().max(120, { error: "tooLong" }),
  experienceYears: z.coerce.number({ error: "number" }).int().min(0, { error: "positive" }).max(60),
  bio: z.string().trim().max(1000, { error: "tooLong" }),
  available: z.enum(["on", ""]),
});

export async function updateTechnicianProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await requireRole(["technician"]);
  const values = formValues(formData, ["specialty", "experienceYears", "bio", "available"]);
  const parsed = techSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const { error } = await createAdminClient()
    .from("ai_conductor_technicians")
    .upsert({
      user_id: profile.id,
      company_id: profile.company_id,
      specialty: parsed.data.specialty,
      experience_years: parsed.data.experienceYears,
      bio: parsed.data.bio,
      available: parsed.data.available === "on",
    });
  if (error) return { status: "error", message: "common.error", values };
  await audit(profile, "technician.profile", { type: "user", id: profile.id });
  revalidatePath("/app", "layout");
  return { status: "success", message: "common.saved", values };
}

/** Saves the technician's position (from the browser) so managers see them on the map. */
export async function saveTechnicianLocation(
  lat: number,
  lng: number,
): Promise<{ ok: boolean; place?: string }> {
  const profile = await requireRole(["technician"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return { ok: false };
  const place = await reverseGeocode(lat, lng);
  const { error } = await createAdminClient()
    .from("ai_conductor_technicians")
    .upsert({
      user_id: profile.id,
      company_id: profile.company_id,
      lat,
      lng,
      city: place?.city ?? null,
      address: place?.label ?? null,
      geolocated_at: new Date().toISOString(),
    });
  if (error) return { ok: false };
  revalidatePath("/app", "layout");
  return { ok: true, place: place?.label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

// ---------- workflow settings (director / admin) ----------

const settingsSchema = z
  .object({
    threshold: z.coerce.number({ error: "number" }).min(0, { error: "positive" }).max(10_000_000),
    reminderDay1: z.coerce.number({ error: "number" }).int().min(1, { error: "positive" }).max(365),
    reminderDay2: z.coerce.number({ error: "number" }).int().min(1, { error: "positive" }).max(365),
    aiPricingNote: z.string().trim().max(2000, { error: "tooLong" }),
  })
  .refine((v) => v.reminderDay2 > v.reminderDay1, {
    error: "reminderOrder",
    path: ["reminderDay2"],
  });

export async function updateWorkflowSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await requireRole(COMPANY_ADMIN_ROLES);
  const values = formValues(formData, [
    "threshold",
    "reminderDay1",
    "reminderDay2",
    "aiPricingNote",
  ]);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  // RLS: director/admin of this company, workflow columns only.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conductor_settings")
    .update({
      approval_threshold_eur: parsed.data.threshold,
      reminder_day1: parsed.data.reminderDay1,
      reminder_day2: parsed.data.reminderDay2,
      ai_pricing_note: parsed.data.aiPricingNote,
    })
    .eq("company_id", profile.company_id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { status: "error", message: "common.error", values };
  await audit(profile, "settings.update", { type: "settings", id: data.id }, parsed.data);
  revalidatePath("/app", "layout");
  return { status: "success", message: "common.saved", values };
}
