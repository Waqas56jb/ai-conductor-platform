import { getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { AppShell } from "@/components/shell/AppShell";
import { getAssistantSettings } from "@/lib/ai/assistant/session";
import { themeVariables } from "@/lib/assistant/defaults";
import { requireProfile } from "@/lib/auth/session";
import { navForRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [tNav, tRoles] = await Promise.all([getTranslations("nav"), getTranslations("roles")]);
  const supabase = await createClient();

  const [
    { data: company },
    { data: notifications },
    { count: unreadCount },
    settings,
    { data: companyTheme },
  ] = await Promise.all([
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
    getAssistantSettings(),
    supabase.from("ai_conductor_company_themes").select("primary_color").maybeSingle(),
  ]);
  const companyColor = companyTheme?.primary_color ?? "blue";
  // Printed on the server so the first paint already has the user's colour.
  const theme = Object.entries(themeVariables(settings.theme_color ?? companyColor))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");

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
      assistant={{ role: profile.role, settings, companyTheme: companyColor }}
    >
      <style>{`:root{${theme}}`}</style>
      {/* Bell and unread count update live. */}
      <LiveRefresh
        channel="my-notifications"
        tables={[{ table: "ai_conductor_notifications", filter: `user_id=eq.${profile.id}` }]}
      />
      {children}
    </AppShell>
  );
}
