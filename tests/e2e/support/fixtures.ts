import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import type { Role } from "../../../src/lib/auth/roles";
import { E2E_PASSWORD, readState } from "./admin";

const SCREENSHOT_ROOT = join(__dirname, "..", "..", "screenshots");
/** Screenshots of the phase being delivered. Phase 1 kept PNG; later phases use JPEG (smaller). */
const PHASE = process.env.E2E_PHASE ?? "phase-2";

type Fixtures = {
  /** Fails the test if the page logged a console error or threw. */
  consoleGuard: void;
  /** Saves tests/screenshots/<phase>/<viewport>-<name>.jpg */
  shot: (name: string, target?: Page) => Promise<void>;
};

function collectErrors(page: Page, errors: string[], tag = "") {
  page.on("pageerror", (e) => errors.push(`${tag}pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${tag}console: ${m.text()}`);
  });
}

export async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const dir = join(SCREENSHOT_ROOT, PHASE);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: join(dir, `${testInfo.project.name}-${name}.jpg`),
    fullPage: true,
    type: "jpeg",
    quality: 70,
  });
}

export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      collectErrors(page, errors);
      await provide();
      expect(errors, "console / page errors").toEqual([]);
    },
    { auto: true },
  ],
  shot: async ({ page }, provide, testInfo) => {
    await provide((name, target) => screenshot(target ?? page, testInfo, name));
  },
});

export { expect };
export type { Page };

/**
 * After a reload or navigation: React reveals streamed content in batches, so
 * for a moment the server copy can sit in a hidden `<div id="S:…">`. Wait
 * until it has been swapped in, so locators see one page.
 */
export async function settled(page: Page) {
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'));
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "horizontal scroll").toBeLessThanOrEqual(clientWidth);
}

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/app");
  await settled(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function login(page: Page, role: Role) {
  await loginAs(page, readState().users[role].email);
}

/**
 * Another signed-in browser (separate cookies) for multi-user flows. Its
 * console errors are collected into `errors`, to be asserted by the test.
 */
export async function openAs(
  browser: Browser,
  testInfo: TestInfo,
  email: string,
  errors: string[],
) {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: testInfo.project.use.viewport,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  const page = await context.newPage();
  collectErrors(page, errors, `[${email}] `);
  await loginAs(page, email);
  return page;
}

export const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 860;
