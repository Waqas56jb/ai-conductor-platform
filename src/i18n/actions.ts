"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Switches the interface language; signed-in users also keep it on their profile. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });

  const profile = await getProfile();
  if (profile) {
    const supabase = await createClient();
    await supabase.from("ai_conductor_users").update({ locale }).eq("id", profile.id);
  }
  revalidatePath("/", "layout");
}
