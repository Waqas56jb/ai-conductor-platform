export const ROLES = [
  "client",
  "technician",
  "manager",
  "director",
  "accountant",
  "admin",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles that manage the company itself (legal details, settings, team). */
export const COMPANY_ADMIN_ROLES: readonly Role[] = ["director", "admin"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
