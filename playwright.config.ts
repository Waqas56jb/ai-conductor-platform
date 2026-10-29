import { defineConfig, devices } from "@playwright/test";

// Tests talk to the real Supabase project with the service role (setup/teardown).
try {
  process.loadEnvFile(".env");
} catch {
  // CI provides the variables directly.
}

/** Local port of the app under test (E2E_PORT when 3000 is taken). */
const PORT = Number(process.env.E2E_PORT ?? 3000);
/** Set E2E_BASE_URL to test a deployment instead of the local dev server. */
const REMOTE = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  globalSetup: "./tests/e2e/support/global-setup.ts",
  globalTeardown: "./tests/e2e/support/global-teardown.ts",
  // Shared real database: run serially so tests never race each other.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: true,
        // Server-side errors show up in the test output.
        stdout: "pipe",
        stderr: "pipe",
        timeout: 180_000,
      },
});
