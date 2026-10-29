import { COMPANY_ADMIN_ROLES, ROLES, type Role } from "@/lib/auth/roles";

/** Icon names are resolved to components on the client (functions can't cross the RSC boundary). */
export type NavIcon = "dashboard" | "profile" | "company";

export type NavItem = {
  href: string;
  /** Key in the "nav" message namespace. */
  labelKey: string;
  icon: NavIcon;
  roles: readonly Role[];
};

// Each phase adds its pages here; the sidebar and search follow automatically.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/app", labelKey: "dashboard", icon: "dashboard", roles: ROLES },
  { href: "/app/company", labelKey: "company", icon: "company", roles: COMPANY_ADMIN_ROLES },
  { href: "/app/profile", labelKey: "profile", icon: "profile", roles: ROLES },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Only same-site paths are allowed as post-login redirects (no open redirect). */
export function safeNextPath(next: unknown, fallback = "/app"): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return fallback;
  }
  return next;
}
