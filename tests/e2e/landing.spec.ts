import { expect, expectNoHorizontalScroll, test, type Page } from "./support/fixtures";

// Feedback round 1 — A: the marketing landing (legacy/client, Vite), served by
// `vite preview` locally or set LANDING_URL to test the deployment.
test.use({ baseURL: process.env.LANDING_URL ?? "http://localhost:4173" });

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 1024;
const BUBBLE_FR = "Bonjour, je suis votre collaboratrice IA. Je m’occupe du reste.";

async function scrollTo(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  // Sections fade in when they enter the viewport.
  await page.waitForTimeout(700);
}

const scrollLeft = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => Math.round(el.scrollLeft));

test.beforeEach(async ({ page }) => {
  // French first, whatever an earlier visit chose.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("lang-reset")) {
      localStorage.removeItem("pratonna.lang");
      sessionStorage.setItem("lang-reset", "1");
    }
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
});

test("hero: the assistant sits beside the headline and greets once", async ({ page, shot }) => {
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Moins d’administratif.Plus de temps pour l’essentiel.");
  await expect(page.getByText("100 % IA")).toHaveCount(0);
  await expect(page.getByText("Exemple d’activité")).toHaveCount(0);
  await expect(page.locator(".ai-lead")).toHaveText(
    "Pratonna lit vos e-mails, prépare vos devis, relance vos clients et suit vos dossiers — vous validez, elle s’en occupe.",
  );

  const titleBox = (await title.boundingBox())!;
  if (isDesktop(page)) {
    const portrait = page.locator(".ai-avatar__portrait");
    await expect(portrait).toBeVisible();
    await expect(page.locator(".ai-hero__head")).toBeHidden();
    const box = (await portrait.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(420);
    expect(box.x + box.width).toBeLessThanOrEqual(titleBox.x + 4); // left column
    // The bubble types its line once, then stays.
    const bubble = page.locator(".ai-bubble > span[aria-hidden]");
    await expect(bubble).toHaveText(BUBBLE_FR, { timeout: 8_000 });
    await page.waitForTimeout(2_500);
    await expect(bubble).toHaveText(BUBBLE_FR);
  } else {
    const head = page.locator(".ai-hero__head");
    await expect(head).toBeVisible();
    await expect(page.locator(".ai-avatar")).toBeHidden();
    const box = (await head.boundingBox())!;
    expect(Math.round(box.width)).toBe(160);
    const width = page.viewportSize()!.width;
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(3); // centred
    expect(box.y + box.height).toBeLessThanOrEqual(titleBox.y); // above, no overlap
  }
  await expectNoHorizontalScroll(page);
  await shot("landing-hero");
});

test("features: honest status chips, no testimonials, a pilot programme", async ({ page, shot }) => {
  await scrollTo(page, "#fonctionnalites");
  const features = page.locator("#fonctionnalites");
  await expect(features.getByRole("heading", { level: 2 })).toHaveText(
    "Ce que Pratonna fait pour vous",
  );
  await expect(features.locator(".lp-chip--available")).toHaveCount(5);
  await expect(features.locator(".lp-chip--soon")).toHaveCount(4);
  for (const soon of ["Assistante vocale", "E-mails Gmail & Outlook", "Comptabilité", "Studio vidéo"])
    await expect(features.locator("article", { hasText: soon }).locator(".lp-chip")).toHaveText(
      "Bientôt",
    );
  await shot("landing-features");

  const integrations = page.locator("#integrations");
  await expect(integrations.locator(".is-available")).toHaveCount(3);
  for (const soon of ["Gmail", "Outlook", "Agendas"])
    await expect(
      integrations
        .locator("li")
        .filter({ has: page.getByText(soon, { exact: true }) })
        .locator(".lp-chip"),
    ).toHaveText("Bientôt");

  await expect(page.getByRole("heading", { name: /Témoignages|Façonnez Pratonna/ })).toHaveCount(0);
  await expect(page.locator(".lp-quote")).toHaveCount(0);
  await scrollTo(page, "#programme-pilote");
  await expect(page.getByRole("heading", { name: "Rejoignez les premières entreprises." })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot("landing-pilot");
});

test("industries carousel: arrows, dots and drag", async ({ page, shot }) => {
  await scrollTo(page, "#solutions");
  const section = page.locator("#solutions");
  const slides = section.locator(".lp-carousel__track > li");
  await expect(slides).toHaveCount(5);
  await expect(section.getByRole("heading", { level: 3 })).toHaveText([
    "Immobilier",
    "Gestion locative & syndic",
    "Construction",
    "Architecture",
    "Artisans",
  ]);
  const track = "#solutions .lp-carousel__track";
  expect(await scrollLeft(page, track)).toBe(0);

  await section.getByRole("button", { name: "Secteur suivant" }).click();
  await expect.poll(() => scrollLeft(page, track)).toBeGreaterThan(0);
  await expect(section.getByRole("button", { name: "Aller au secteur 2" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await section.getByRole("button", { name: "Aller au secteur 5" }).click();
  await expect(section.getByRole("button", { name: "Secteur suivant" })).toBeDisabled();
  await shot("landing-industries");

  // Drag back towards the start.
  await section.getByRole("button", { name: "Aller au secteur 1" }).click();
  await expect.poll(() => scrollLeft(page, track)).toBe(0);
  const box = (await page.locator(track).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => scrollLeft(page, track)).toBeGreaterThan(0);
  await expectNoHorizontalScroll(page);
});

test("product screens: real screenshots load in the carousel", async ({ page, shot }) => {
  await scrollTo(page, "#interface");
  const section = page.locator("#interface");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Découvrez l’interface.");
  const images = section.locator(".lp-device img");
  await expect(images).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    if (i) await section.getByRole("button", { name: "Capture suivante" }).click();
    await expect
      .poll(() => images.nth(i).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBe(1440);
  }
  await expect(section.getByRole("link", { name: "Demander une démo" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot("landing-screens");
});

test("FR/EN switches every new string", async ({ page, shot }) => {
  await page.getByRole("button", { name: "Changer de langue" }).filter({ visible: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Less admin.More time for what matters.",
  );
  if (isDesktop(page))
    await expect(page.locator(".ai-bubble .lp-sr-only")).toHaveText(
      "Hello, I’m your AI teammate. I’ll take care of the rest.",
    );
  await expect(page.locator("#fonctionnalites h2")).toHaveText("What Pratonna does for you");
  await expect(page.locator("#fonctionnalites .lp-chip--soon").first()).toHaveText("Coming soon");
  await expect(page.locator("#fonctionnalites .lp-chip--available").first()).toHaveText("Available");
  await expect(page.locator("#integrations h2")).toHaveText("What works today.");
  await expect(page.locator("#solutions h3").nth(1)).toHaveText("Lettings & property management");
  await expect(page.getByRole("button", { name: "Next sector" })).toHaveCount(1);
  await expect(page.locator("#interface h2")).toHaveText("See the interface.");
  await expect(page.locator("#programme-pilote h2")).toHaveText("Join the first companies.");
  // No French left in the new sections.
  for (const id of ["#fonctionnalites", "#integrations", "#solutions", "#interface", "#programme-pilote"])
    await expect(page.locator(id)).not.toContainText(/Bientôt|Disponible|Découvrez|Rejoignez/);
  await expectNoHorizontalScroll(page);
  await shot("landing-en");
});
