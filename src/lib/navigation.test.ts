import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/auth/roles";
import { navForRole, safeNextPath } from "./navigation";

describe("navForRole", () => {
  it("gives every role the dashboard and profile", () => {
    for (const role of ROLES) {
      const hrefs = navForRole(role).map((item) => item.href);
      expect(hrefs).toContain("/app");
      expect(hrefs).toContain("/app/profile");
    }
  });

  it("shows the company page to director and admin only", () => {
    const withCompany = ROLES.filter((role) =>
      navForRole(role).some((i) => i.href === "/app/company"),
    );
    expect(withCompany).toEqual(["director", "admin"]);
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
