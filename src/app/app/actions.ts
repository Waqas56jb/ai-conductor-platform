"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/i18n/config";
import { COMPANY_ADMIN_ROLES } from "@/lib/auth/roles";
import { requireProfile, requireRole } from "@/lib/auth/session";
import { formValues, type FormState } from "@/lib/forms";
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
