"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/i18n/config";
import { env } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { safeNextPath } from "@/lib/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/errors";
import { forgotSchema, loginSchema, newPasswordSchema, signupSchema } from "@/lib/validation/auth";

const callbackUrl = (next: string) =>
  `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrors(parsed.error),
      values: { email: values.email },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const message =
      error?.code === "email_not_confirmed" ? "auth.login.unconfirmed" : "auth.login.invalid";
    return { status: "error", message, values: { email: values.email } };
  }

  // The Supabase Auth pool is shared with other apps: a valid login is not
  // enough, the account must have a Pratonna profile.
  const { data: profile } = await supabase
    .from("ai_conductor_users")
    .select("id, locale")
    .eq("auth_user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { status: "error", message: "auth.login.noProfile", values: { email: values.email } };
  }

  await createAdminClient()
    .from("ai_conductor_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.id);
  (await cookies()).set(LOCALE_COOKIE, profile.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(safeNextPath(values.next));
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["fullName", "companyName", "email", "password"]);
  const keep = { fullName: values.fullName, companyName: values.companyName, email: values.email };
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: keep };
  const { fullName, companyName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl("/app"), data: { display_name: fullName } },
  });
  if (error) {
    if (error.code === "email_address_invalid") {
      return { status: "error", fieldErrors: { email: "email" }, values: keep };
    }
    // The confirmation email could not go out (SMTP failure or Supabase's send rate limit).
    const emailFailed =
      error.code === "over_email_send_rate_limit" || /sending/i.test(error.message);
    const message =
      error.code === "user_already_exists"
        ? "auth.signup.exists"
        : emailFailed
          ? "auth.signup.emailFailed"
          : "common.error";
    return { status: "error", message, values: keep };
  }
  // With email confirmation on, Supabase hides existing accounts behind a user with no identities.
  if (!data.user || data.user.identities?.length === 0) {
    return { status: "error", message: "auth.signup.exists", values: keep };
  }

  const authUserId = data.user.id;
  const admin = createAdminClient();
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "fr";

  // Company → director profile → settings. Undo everything if a step fails.
  const { data: company, error: companyError } = await admin
    .from("ai_conductor_companies")
    .insert({ name: companyName })
    .select("id")
    .single();
  const { data: profile, error: profileError } = company
    ? await admin
        .from("ai_conductor_users")
        .insert({
          email,
          role: "director",
          display_name: fullName,
          locale,
          company_id: company.id,
          auth_user_id: authUserId,
        })
        .select("id")
        .single()
    : { data: null, error: companyError };
  const { error: settingsError } =
    company && profile
      ? await admin
          .from("ai_conductor_settings")
          .insert({ company_id: company.id, company_name: companyName })
      : { error: profileError };
  const { error: directorError } =
    company && profile && !settingsError
      ? await admin
          .from("ai_conductor_directors")
          .insert({ user_id: profile.id, company_id: company.id })
      : { error: settingsError };

  if (companyError || profileError || settingsError || directorError) {
    if (company) await admin.from("ai_conductor_companies").delete().eq("id", company.id); // cascades
    await admin.auth.admin.deleteUser(authUserId);
    const duplicate = profileError?.code === "23505";
    return {
      status: "error",
      message: duplicate ? "auth.signup.exists" : "common.error",
      values: keep,
    };
  }

  if (data.session) redirect("/app");
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  // A send failure says nothing about the account, so it can be reported.
  if (error?.code === "over_email_send_rate_limit") {
    return { status: "error", message: "auth.forgot.failed", values };
  }
  // Otherwise the same answer whether or not the account exists (no enumeration).
  return { status: "success", message: "auth.forgot.sent" };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password", "confirm"]);
  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "auth.reset.expired" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = error.code === "same_password" ? "auth.reset.samePassword" : "common.error";
    return { status: "error", message };
  }
  return { status: "success", message: "profile.passwordUpdated" };
}
