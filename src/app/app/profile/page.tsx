import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileTabs } from "@/components/account/ProfileTabs";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile"))("title") };
}

export default async function ProfilePage() {
  const profile = await requireProfile();
  const [t, tRoles] = await Promise.all([getTranslations("profile"), getTranslations("roles")]);
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("ai_conductor_companies")
    .select("name")
    .eq("id", profile.company_id)
    .single();
  const { data: tech } =
    profile.role === "technician"
      ? await supabase
          .from("ai_conductor_technicians")
          .select("specialty, experience_years, bio, available, address, city")
          .eq("user_id", profile.id)
          .maybeSingle()
      : { data: null };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <ProfileTabs
        profile={{
          displayName: profile.display_name,
          phone: profile.phone ?? "",
          locale: profile.locale,
          email: profile.email,
          roleLabel: tRoles(profile.role),
          companyName: company?.name ?? "",
        }}
        technician={
          tech
            ? {
                specialty: tech.specialty ?? "",
                experienceYears: tech.experience_years ?? 0,
                bio: tech.bio ?? "",
                available: tech.available,
                place: tech.address ?? tech.city,
              }
            : profile.role === "technician"
              ? { specialty: "", experienceYears: 0, bio: "", available: true, place: null }
              : undefined
        }
      />
    </div>
  );
}
