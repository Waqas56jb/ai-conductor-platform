import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/shell/AppShell";
import { requireProfile } from "@/lib/auth/session";
import { navForRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [tNav, tRoles] = await Promise.all([getTranslations("nav"), getTranslations("roles")]);
  const supabase = await createClient();

  const [{ data: company }, { data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase.from("ai_conductor_companies").select("name").eq("id", profile.company_id).single(),
    supabase
      .from("ai_conductor_notifications")
      .select("id, title, body, read, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ai_conductor_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("read", false),
  ]);

  return (
    <AppShell
      nav={navForRole(profile.role).map((item) => ({
        href: item.href,
        label: tNav(item.labelKey),
        icon: item.icon,
      }))}
      user={{
        name: profile.display_name || profile.email,
        email: profile.email,
        roleLabel: tRoles(profile.role),
        companyName: company?.name ?? "",
      }}
      notifications={(notifications ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.created_at,
      }))}
      unreadCount={unreadCount ?? 0}
    >
      {children}
    </AppShell>
  );
}
