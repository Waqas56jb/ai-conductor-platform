import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import type { Role } from "../../../src/lib/auth/roles";
import { E2E_PASSWORD, readState } from "./admin";

const SCREENSHOT_ROOT = join(__dirname, "..", "..", "screenshots");

type Fixtures = {
  /** Fails the test if the page logged a console error or threw. */
  consoleGuard: void;
  /** Saves tests/screenshots/<phase>/<viewport>-<name>.png */
  shot: (name: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console: ${m.text()}`);
      });
      await provide();
      expect(errors, "console / page errors").toEqual([]);
    },
    { auto: true },
  ],
  shot: async ({ page }, provide, testInfo) => {
    const dir = join(SCREENSHOT_ROOT, process.env.E2E_PHASE ?? "phase-1");
    mkdirSync(dir, { recursive: true });
    await provide(async (name) => {
      await page.screenshot({
        path: join(dir, `${testInfo.project.name}-${name}.png`),
        fullPage: true,
      });
    });
  },
});

export { expect };
export type { Page };

export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "horizontal scroll").toBeLessThanOrEqual(clientWidth);
}

export async function login(page: Page, role: Role) {
  const { users } = readState();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(users[role].email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 860;
