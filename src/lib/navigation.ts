import { PAYMENT_ROLES, REPORT_ROLES } from "@/lib/accounting/access";
import { COMPANY_ADMIN_ROLES, ROLES, type Role } from "@/lib/auth/roles";
import { SERVICE_ORDER_ROLES } from "@/lib/workflows/service-order";

/** Icon names are resolved to components on the client (functions can't cross the RSC boundary). */
export type NavIcon =
  | "dashboard"
  | "assistant"
  | "report"
  | "cases"
  | "approvals"
  | "quotes"
  | "invoices"
  | "calendar"
  | "technicians"
  | "chats"
  | "support"
  | "notifications"
  | "reminders"
  | "contracts"
  | "serviceOrders"
  | "payments"
  | "reports"
  | "tasks"
  | "meetings"
  | "emails"
  | "directory"
  | "profile"
  | "company";

export type NavItem = {
  href: string;
  /** Key in the "nav" message namespace; may differ by role. */
  labelKey: string | (Partial<Record<Role, string>> & { default: string });
  icon: NavIcon;
  roles: readonly Role[];
};

const OFFICE: readonly Role[] = ["manager", "director", "admin"];
const STAFF: readonly Role[] = [...OFFICE, "accountant"];
const TEAM: readonly Role[] = [...STAFF, "technician"];

// Each phase adds its pages here; the sidebar and search follow automatically.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/app", labelKey: "dashboard", icon: "dashboard", roles: ROLES },
  { href: "/app/assistant", labelKey: "assistant", icon: "assistant", roles: ROLES },
  { href: "/app/cases/new", labelKey: "report", icon: "report", roles: ["client"] },
  {
    href: "/app/cases",
    labelKey: { default: "cases", client: "myCases", technician: "tasks" },
    icon: "cases",
    roles: ROLES,
  },
  { href: "/app/approvals", labelKey: "approvals", icon: "approvals", roles: OFFICE },
  { href: "/app/quotes", labelKey: "quotes", icon: "quotes", roles: ["client"] },
  { href: "/app/contracts", labelKey: "contracts", icon: "contracts", roles: ["client", ...STAFF] },
  {
    href: "/app/invoices",
    labelKey: { default: "invoices", director: "finance", accountant: "finance" },
    icon: "invoices",
    roles: ["client", ...STAFF],
  },
  { href: "/app/payments", labelKey: "payments", icon: "payments", roles: PAYMENT_ROLES },
  {
    href: "/app/service-orders",
    labelKey: "serviceOrders",
    icon: "serviceOrders",
    roles: SERVICE_ORDER_ROLES,
  },
  { href: "/app/reports", labelKey: "reports", icon: "reports", roles: REPORT_ROLES },
  {
    href: "/app/calendar",
    labelKey: { default: "calendar", director: "interventions" },
    icon: "calendar",
    roles: [...OFFICE, "technician"],
  },
  { href: "/app/technicians", labelKey: "technicians", icon: "technicians", roles: OFFICE },
  { href: "/app/tasks", labelKey: "teamTasks", icon: "tasks", roles: TEAM },
  { href: "/app/meetings", labelKey: "meetings", icon: "meetings", roles: TEAM },
  { href: "/app/emails", labelKey: "emails", icon: "emails", roles: TEAM },
  { href: "/app/chats", labelKey: "chats", icon: "chats", roles: [...OFFICE, "technician"] },
  { href: "/app/directory", labelKey: "directory", icon: "directory", roles: TEAM },
  { href: "/app/notifications", labelKey: "notifications", icon: "notifications", roles: ROLES },
  { href: "/app/reminders", labelKey: "reminders", icon: "reminders", roles: ROLES },
  { href: "/app/support", labelKey: "support", icon: "support", roles: ["client"] },
  { href: "/app/company", labelKey: "company", icon: "company", roles: COMPANY_ADMIN_ROLES },
  { href: "/app/profile", labelKey: "profile", icon: "profile", roles: ROLES },
];

export function navForRole(role: Role): { href: string; labelKey: string; icon: NavIcon }[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
    href: item.href,
    icon: item.icon,
    labelKey:
      typeof item.labelKey === "string"
        ? item.labelKey
        : (item.labelKey[role] ?? item.labelKey.default),
  }));
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
