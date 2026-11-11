import { adminClient, e2eEmail, readState } from "./support/admin";
import { expect, expectNoHorizontalScroll, loginAs, test, type Page } from "./support/fixtures";

// Website brief (Nov 2026): free demo booking, real estate first, sector
// pages, the 1-minute video, anonymous conversion tracking. The landing is
// served by `vite preview` (built with VITE_APP_URL pointing at the app under
// test) or LANDING_URL; the app by the usual E2E server or E2E_BASE_URL.
const APP = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3000}`;
const LANDING = process.env.LANDING_URL ?? "http://localhost:4173";
/** The site's origin, the only one the booking API answers. */
const SITE = { Origin: new URL(LANDING).origin };
test.use({ baseURL: LANDING });

// Test traffic is tagged and deleted: it never shows in the client's figures.
const TAG = "e2e";
const optOut = (page: Page) =>
  page.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }),
  );

async function cleanup() {
  const db = adminClient();
  await db.from("ai_conductor_demo_requests").delete().like("email", "%@pratonna-e2e.test");
  await db.from("ai_conductor_site_events").delete().eq("source", TAG);
}
test.afterAll(cleanup);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("lang-reset")) {
      localStorage.removeItem("pratonna.lang");
      sessionStorage.setItem("lang-reset", "1");
    }
  });
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test("real estate comes first on the home page, the other trades one tab away", async ({ page, shot }) => {
  await optOut(page);
  await open(page, "/");
  const tab = page.getByRole("tab", { name: "Immobilier" });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  const panel = page.locator("#lp-panel-realEstate");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Copropriété et gestion locative, enfin à jour.",
  );
  await expect(panel.locator("video")).toHaveAttribute("poster", "/demo-immobilier-poster.jpg");
  await expect(panel.getByRole("heading", { level: 3 })).toContainText(["Gestion de copropriété", "Gestion locative"]);
  await expect(panel.locator(".lp-chip--available")).toHaveCount(5);
  await expect(panel.locator(".lp-chip--soon")).toHaveCount(5);
  for (const soon of ["État daté et pré-état daté édités en quelques clics", "Appels de charges", "États des lieux d’entrée et de sortie"])
    await expect(panel.locator("li", { hasText: soon }).locator(".lp-chip")).toHaveText("Bientôt");
  await expectNoHorizontalScroll(page);
  await shot("home-real-estate");

  await page.getByRole("tab", { name: "Autres activités" }).click();
  await expect(page.locator("#solutions")).toBeVisible();
  await expect(panel).toHaveCount(0);
  await page.getByRole("tab", { name: "Autres activités" }).press("ArrowLeft");
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute("aria-selected", "true");

  await page.getByRole("link", { name: "Tout voir pour l’immobilier" }).click();
  await expect(page).toHaveURL(/\/immobilier$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("L’immobilier, sans la paperasse.");
});

test("sector pages: their own title, honest chips, a booking form for their trade", async ({ page, request, shot }) => {
  await optOut(page);
  const pages = [
    { path: "/immobilier", h1: "L’immobilier, sans la paperasse.", title: /^Pratonna pour l’immobilier/, sector: "Agence immobilière", video: true },
    { path: "/btp", h1: "Vos chantiers suivis, de la demande à la facture.", title: /^Pratonna pour le BTP/, sector: "Entreprise BTP", video: false },
  ];
  for (const p of pages) {
    await open(page, p.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    await expect(page).toHaveTitle(p.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://pratonna.com${p.path}`);
    await expect(page.locator(".lp-sector-hero").getByRole("link", { name: "Réserver une démo gratuite" })).toBeVisible();
    await expect(page.locator(".lp-sector-hero").getByText("Démo et test pilote 100 % gratuits, sans engagement")).toBeVisible();
    await expect(page.locator("#video")).toHaveCount(p.video ? 1 : 0);
    await expect(page.locator("#fonctionnalites .lp-chip--soon").first()).toHaveText("Bientôt");
    await expect(page.locator("#demo select")).toHaveValue(p.sector);
    await expectNoHorizontalScroll(page);
    await shot(`page${p.path.replace("/", "-")}`);

    // Crawlers and link previews get the page's own head without JavaScript.
    const html = await (await request.get(`${p.path}.html`)).text();
    expect(html).toMatch(new RegExp(`<title>${p.title.source.slice(1)}`));
    expect(html).toContain(`<link rel="canonical" href="https://pratonna.com${p.path}"`);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/", "/immobilier", "/btp"]) expect(sitemap).toContain(`<loc>https://pratonna.com${path}</loc>`);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap: https://pratonna.com/sitemap.xml");
});

test("the demo video is the 1-minute narrated one", async ({ page }) => {
  await optOut(page);
  await open(page, "/immobilier#video");
  const video = page.locator("#video video");
  await video.evaluate((v: HTMLVideoElement) => {
    v.preload = "metadata";
    v.load();
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.duration), { timeout: 30_000 }).toBeGreaterThan(45);
  expect(await video.evaluate((v: HTMLVideoElement) => v.duration)).toBeLessThanOrEqual(60.5);
  // The hero button opens the same demo, with sound, in the lightbox.
  await open(page, "/");
  await page.getByRole("button", { name: "Voir la démo (1 min)" }).click();
  await expect(page.locator(".ai-lightbox video")).toHaveAttribute("src", /\/demo-immobilier(-720)?\.mp4$/);
});

test("booking a free demo: pick a slot, get it confirmed by the team", async ({ page, browser, request, shot }, testInfo) => {
  await optOut(page);
  const email = e2eEmail(`booking-${testInfo.project.name}`);
  await open(page, `/immobilier?utm_source=${TAG}&utm_medium=qr&utm_campaign=porte-a-porte`);
  const form = page.locator("#demo");
  await form.scrollIntoViewIfNeeded();
  await expect(form.getByRole("heading", { level: 2 })).toHaveText("Réservez votre démo gratuite.");
  await expect(form.getByText("Démo et test pilote 100 % gratuits, sans engagement")).toBeVisible();

  // Nothing is sent without a slot.
  await form.getByLabel("Nom complet").fill("Agence E2E");
  await form.getByLabel("E-mail professionnel").fill(email);
  await form.getByLabel("Entreprise", { exact: true }).fill("Agence du Parc (tests)");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Réserver ma démo gratuite" }).click();
  await expect(form.getByRole("alert")).toHaveText("Choisissez un jour et une heure.");

  const day = form.getByRole("radiogroup", { name: "Jour" }).getByRole("radio").first();
  await expect(day).toHaveAttribute("aria-checked", "true");
  const time = form.getByRole("radiogroup", { name: "Heure" }).getByRole("radio").first();
  await time.click();
  await expect(time).toHaveAttribute("aria-checked", "true");
  await expectNoHorizontalScroll(page);
  await shot("booking-form");
  await form.getByRole("button", { name: "Réserver ma démo gratuite" }).click();
  await expect(form.getByRole("heading", { name: "C’est réservé !" })).toBeVisible();
  await expect(form.getByRole("status")).toContainText("(heure de Paris)");
  await shot("booking-done");

  const db = adminClient();
  const { data: row } = await db.from("ai_conductor_demo_requests").select("*").eq("email", email).single();
  expect(row).toMatchObject({
    status: "requested",
    sector: "Agence immobilière",
    company: "Agence du Parc (tests)",
    source: TAG,
    medium: "qr",
    campaign: "porte-a-porte",
    locale: "fr",
  });
  // The slot is taken: no longer offered, and a second booking of it fails.
  const slots = (await (await request.get(`${APP}/api/demo/slots`)).json()).slots as string[];
  expect(slots).not.toContain(new Date(row!.slot_start).toISOString());
  const again = await request.post(`${APP}/api/demo/requests`, {
    headers: SITE,
    data: { name: "Autre", email: e2eEmail("booking-again"), slot: new Date(row!.slot_start).toISOString(), consent: true, source: TAG },
  });
  expect(again.status()).toBe(409);

  // The team confirms from the link in its email.
  const team = await browser.newPage();
  await team.goto(`${APP}/demo/${row!.token}`);
  await expect(team.getByRole("heading", { level: 1 })).toHaveText("Agence E2E");
  await expect(team.getByText("À confirmer")).toBeVisible();
  await team.getByRole("button", { name: "Confirmer le rendez-vous" }).click();
  await expect(team.getByText("Confirmée")).toBeVisible();
  await expect(team.getByRole("button", { name: "Confirmer le rendez-vous" })).toHaveCount(0);
  await team.close();

  const { data: after } = await db.from("ai_conductor_demo_requests").select("status, confirmed_at").eq("id", row!.id).single();
  expect(after?.status).toBe("confirmed");
  const { data: events } = await db.from("ai_conductor_site_events").select("name").eq("source", TAG);
  expect(events?.map((e) => e.name)).toEqual(expect.arrayContaining(["demo_submit", "demo_confirmed"]));
  await cleanup();
});

test("the booking API only answers the site, and only for real slots", async ({ request }) => {
  test.skip(test.info().project.name !== "1440", "API checks: one width is enough");
  const body = { name: "Test", email: e2eEmail("booking-api"), slot: "2026-01-01T10:00:00.000Z", consent: true, source: TAG };
  const foreign = await request.post(`${APP}/api/demo/requests`, { headers: { Origin: "https://evil.example" }, data: body });
  expect(foreign.status()).toBe(403);
  expect((await request.post(`${APP}/api/demo/requests`, { headers: SITE, data: body })).status()).toBe(409);
  expect((await request.post(`${APP}/api/demo/requests`, { headers: SITE, data: { ...body, consent: false } })).status()).toBe(400);
  expect(
    (await request.post(`${APP}/api/demo/events`, { headers: SITE, data: { name: "demo_confirmed", source: TAG } })).status(),
  ).toBe(400);
});

test("demo clicks are counted anonymously, never when the visitor opts out", async ({ page, browser }) => {
  test.skip(test.info().project.name !== "1440", "one width is enough");
  const db = adminClient();
  await open(page, `/?utm_source=${TAG}`);
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/demo/events") && r.postData()?.includes("demo_click") === true);
  await page.locator(".ai-ctas").getByRole("link", { name: "Réserver une démo gratuite" }).click();
  const payload = JSON.parse((await sent).postData()!);
  expect(payload).toEqual({ name: "demo_click", placement: "hero", page: "home", device: "desktop", source: TAG });
  await expect
    .poll(async () => (await db.from("ai_conductor_site_events").select("name, placement").eq("source", TAG).eq("name", "demo_click")).data)
    .toEqual([{ name: "demo_click", placement: "hero" }]);

  const private_ = await browser.newPage();
  await optOut(private_);
  let tracked = false;
  private_.on("request", (r) => {
    if (r.url().endsWith("/api/demo/events")) tracked = true;
  });
  await open(private_, `/?utm_source=${TAG}`);
  await private_.locator(".ai-ctas").getByRole("link", { name: "Réserver une démo gratuite" }).click();
  await private_.waitForTimeout(1500);
  expect(tracked).toBe(false);
  await private_.close();
  await cleanup();
});

test("the Pratonna team sees the funnel; company users do not", async ({ browser }) => {
  test.skip(test.info().project.name !== "1440", "one width is enough");
  test.skip(!process.env.E2E_PLATFORM_ADMIN, "needs the app started with PLATFORM_ADMIN_EMAILS");
  const { users } = readState();
  const ctx = await browser.newContext({ baseURL: APP });
  const page = await ctx.newPage();
  await loginAs(page, users.manager.email);
  await page.goto("/app/demos");
  await expect(page.getByRole("heading", { name: "Démos & site" })).toHaveCount(0);
  await ctx.clearCookies();
  await loginAs(page, process.env.E2E_PLATFORM_ADMIN!);
  await page.goto("/app/demos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Démos & site");
  for (const kpi of ["Visites", "Clics « Démo gratuite »", "Demandes envoyées", "Rendez-vous confirmés"])
    await expect(page.getByText(kpi, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Mesure anonyme/)).toBeVisible();
  await ctx.close();
});
