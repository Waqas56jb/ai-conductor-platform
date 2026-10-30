import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/auth/roles";
import { navForRole, safeNextPath } from "./navigation";

const hrefs = (role: (typeof ROLES)[number]) => navForRole(role).map((item) => item.href);

describe("navForRole", () => {
  it("gives every role the dashboard, cases, notifications and profile", () => {
    for (const role of ROLES) {
      expect(hrefs(role)).toEqual(
        expect.arrayContaining(["/app", "/app/cases", "/app/notifications", "/app/profile"]),
      );
    }
  });

  it("shows each panel to the right roles only", () => {
    const withPage = (href: string) => ROLES.filter((role) => hrefs(role).includes(href));
    expect(withPage("/app/company")).toEqual(["director", "admin"]);
    expect(withPage("/app/approvals")).toEqual(["manager", "director", "admin"]);
    expect(withPage("/app/cases/new")).toEqual(["client"]);
    expect(withPage("/app/quotes")).toEqual(["client"]);
    expect(withPage("/app/technicians")).toEqual(["manager", "director", "admin"]);
    expect(withPage("/app/calendar")).toEqual(["technician", "manager", "director", "admin"]);
    expect(withPage("/app/reports")).toEqual(["director", "accountant", "admin"]);
    expect(withPage("/app/payments")).toEqual(["manager", "director", "accountant", "admin"]);
    expect(withPage("/app/service-orders")).toEqual(["manager", "director", "accountant", "admin"]);
    expect(withPage("/app/invoices")).toEqual([
      "client",
      "manager",
      "director",
      "accountant",
      "admin",
    ]);
  });

  it("labels shared pages per role", () => {
    const label = (role: (typeof ROLES)[number], href: string) =>
      navForRole(role).find((i) => i.href === href)?.labelKey;
    expect(label("client", "/app/cases")).toBe("myCases");
    expect(label("technician", "/app/cases")).toBe("tasks");
    expect(label("manager", "/app/cases")).toBe("cases");
    expect(label("director", "/app/invoices")).toBe("finance");
    expect(label("client", "/app/invoices")).toBe("invoices");
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/app/profile", "/app/profile"],
    ["/app?tab=1", "/app?tab=1"],
    [undefined, "/app"],
    ["", "/app"],
    ["https://evil.example", "/app"],
    ["//evil.example", "/app"],
    ["/\\evil.example", "/app"],
    ["app", "/app"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
