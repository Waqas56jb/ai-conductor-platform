import { ROLES } from "../../src/lib/auth/roles";
import { navForRole } from "../../src/lib/navigation";
import { expect, expectNoHorizontalScroll, login, test } from "./support/fixtures";

// Every page in every role's menu renders (h1, no console error, no horizontal scroll).
for (const role of ROLES) {
  test(`${role}: every menu page renders`, async ({ page, shot }) => {
    test.setTimeout(180_000);
    await login(page, role);
    for (const item of navForRole(role)) {
      await page.goto(item.href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Page introuvable")).toHaveCount(0);
      await expectNoHorizontalScroll(page);
      const slug = item.href.replace(/^\/app\/?/, "").replace(/\//g, "-") || "dashboard";
      await shot(`${role}-${slug}`);
    }
  });
}
