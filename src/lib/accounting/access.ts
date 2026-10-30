import type { Role } from "@/lib/auth/roles";

/** Reports and the FEC / CSV exports: finance, never managers or the field. */
export const REPORT_ROLES: readonly Role[] = ["director", "accountant", "admin"];

/** Payments list: the office and accounting. */
export const PAYMENT_ROLES: readonly Role[] = ["manager", "director", "admin", "accountant"];
