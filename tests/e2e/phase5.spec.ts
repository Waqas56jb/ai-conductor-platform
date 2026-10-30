import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  login,
  loginAs,
  openAs,
  test,
  type Page,
} from "./support/fixtures";

// Phase 5 — email (OAuth), documents (contracts, invoice PDFs), team tasks,
// meeting summaries, recommendations. Real Supabase (+ OpenAI for meetings).

const GOOGLE = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const MICROSOFT = Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
const desktop = (page: Page) => (page.viewportSize()?.width ?? 0) === 1440;
const tag = () => randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });

async function auditActions(entityId: string) {
  const { data } = await adminClient()
    .from("ai_conductor_audit_log")
    .select("action")
    .eq("entity_id", entityId);
  return (data ?? []).map((a) => a.action as string);
}

test.describe("email integrations", () => {
  test("without OAuth apps: a clean “not configured” state, and the flow refuses to start", async ({
    page,
    shot,
  }) => {
    await login(page, "manager");
    await page.goto("/app/settings/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Intégrations");
    for (const [id, configured] of [
      ["google", GOOGLE],
      ["microsoft", MICROSOFT],
    ] as const) {
      const card = page.getByTestId(`provider-${id}`);
      if (configured) {
        await expect(card.getByRole("link", { name: "Connecter" })).toHaveAttribute(
          "href",
          `/api/integrations/${id}/connect`,
        );
      } else {
        await expect(
          card.getByText("Connexion non configurée", { exact: true }).first(),
        ).toBeVisible();
        await expect(card.getByRole("button", { name: "Connecter" })).toBeDisabled();
        await expect(card.getByRole("note")).toContainText("un administrateur");
      }
    }
    await expectNoHorizontalScroll(page);
    await shot("integrations");

    if (!GOOGLE) {
      await page.goto("/api/integrations/google/connect");
      await expect(page).toHaveURL(/\/app\/settings\/integrations\?error=notConfigured$/);
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Connexion non configurée pour ce fournisseur." }),
      ).toBeVisible();
    }
    // A callback without the matching state is refused either way.
    await page.goto("/api/integrations/google/callback?code=forged&state=forged");
    await expect(page).toHaveURL(/error=(notConfigured|state)$/);

    await page.goto("/app/emails");
    await expect(page.getByText("Aucune messagerie connectée")).toBeVisible();
    await expect(page.getByRole("link", { name: "Connecter une messagerie" })).toBeVisible();
  });

  test("clients have no mailbox pages", async ({ page }) => {
    await login(page, "client");
    for (const path of [
      "/app/emails",
      "/app/settings/integrations",
      "/app/tasks",
      "/app/meetings",
    ]) {
      await page.goto(path);
      await expect(page.getByText("Page introuvable")).toBeVisible();
    }
  });
});

test.describe("documents", () => {
  test("contracts: numbered drafts, PDF, confirmed send, the client signs (DocuSign)", async ({
    page,
    browser,
    shot,
  }, testInfo) => {
    test.skip(!desktop(page), "writes shared rows");
    test.setTimeout(240_000);
    const { users, companyId } = readState();
    const t = tag();
    await login(page, "manager");
    await page.goto("/app/contracts");
    for (const n of [1, 2]) {
      await page.getByRole("button", { name: "Nouveau contrat" }).click();
      const dialog = page.getByRole("dialog", { name: "Nouveau contrat" });
      await dialog.getByLabel("Client").selectOption(users.client.profileId);
      await dialog.getByLabel("Intitulé").fill(`Entretien chaudière ${t}-${n}`);
      await dialog.getByLabel("Montant HT (€)").fill("1200");
      await dialog.getByLabel("Conditions").fill("Deux visites par an, pièces en sus.");
      await dialog.getByRole("button", { name: "Créer le brouillon" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(`Entretien chaudière ${t}-${n}`)).toBeVisible();
    }
    const { data: rows } = await adminClient()
      .from("ai_conductor_contracts")
      .select("id, reference, total_ttc, status")
      .eq("company_id", companyId)
      .like("title", `Entretien chaudière ${t}%`)
      .order("reference");
    expect(rows).toHaveLength(2);
    const [a, b] = rows!;
    // Sequential, unbroken per company and year.
    const num = (r: string) => Number(r.split("-")[2]);
    expect(a.reference).toMatch(/^CTR-\d{4}-\d{4}$/);
    expect(num(b.reference)).toBe(num(a.reference) + 1);
    expect(Number(a.total_ttc)).toBe(1440);

    const pdf = await page.request.get(`/api/documents/contract/${a.id}`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    const card = page.locator(`[data-contract="${a.reference}"]`);
    await expect(card).toContainText("Brouillon");
    await card.getByRole("button", { name: "Envoyer au client" }).click();
    await page
      .getByRole("dialog", { name: "Envoyer au client" })
      .getByRole("button", { name: "Envoyer au client" })
      .click();
    await expect(card).toContainText("À signer");
    expect(await auditActions(a.id)).toEqual(
      expect.arrayContaining(["contract.created", "contract.sent"]),
    );
    await shot("contracts-office");

    const errors: string[] = [];
    const client = await openAs(browser, testInfo, users.client.email, errors);
    await client.goto("/app/contracts");
    const mine = client.locator(`[data-contract="${a.reference}"]`);
    const sign = mine.getByRole("button", { name: "Signer le contrat" });
    if (process.env.DOCUSIGN_INTEGRATION_KEY) await expect(sign).toBeEnabled();
    else {
      await expect(sign).toBeDisabled();
      await expect(mine.getByRole("note")).toHaveText("Signature électronique non configurée");
    }
    // The other one is still a draft: not shown to the client, not even as a PDF.
    await expect(client.locator(`[data-contract="${b.reference}"]`)).toHaveCount(0);
    expect((await client.request.get(`/api/documents/contract/${b.id}`)).status()).toBe(404);
    await shot("contracts-client", client);
    // Another client never sees it.
    const other = await openAs(browser, testInfo, readState().client2.email, errors);
    await other.goto("/app/contracts");
    await expect(other.locator(`[data-contract="${a.reference}"]`)).toHaveCount(0);
    expect((await other.request.get(`/api/documents/contract/${a.id}`)).status()).toBe(404);
    expect(errors).toEqual([]);
  });

  test("invoice PDF for its client only", async ({ page, browser }, testInfo) => {
    test.skip(!desktop(page), "writes shared rows");
    const { users, companyId, client2 } = readState();
    const t = tag();
    await adminClient()
      .from("ai_conductor_invoices")
      .insert({
        id: `FAC-${t}`,
        reference: `FAC-E2E-${t}`,
        company_id: companyId,
        client_id: users.client.profileId,
        title: `Réparation ${t}`,
        amount: 240,
        status: "unpaid",
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
    await login(page, "client");
    const res = await page.request.get(`/api/documents/invoice/FAC-${t}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    const errors: string[] = [];
    const other = await openAs(browser, testInfo, client2.email, errors);
    expect((await other.request.get(`/api/documents/invoice/FAC-${t}`)).status()).toBe(404);
  });
});

test.describe("team tasks", () => {
  test("assign, see it in “my tasks”, move it, delete after confirming", async ({
    page,
    browser,
    shot,
  }, testInfo) => {
    test.skip(!desktop(page), "writes shared rows");
    const { users } = readState();
    const t = tag();
    await login(page, "manager");
    await page.goto("/app/tasks");
    await page.getByRole("button", { name: "Nouvelle tâche" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle tâche" });
    await dialog.getByLabel("Intitulé").fill(`Commander les joints ${t}`);
    await dialog.getByLabel("Responsable").selectOption(users.technician.profileId);
    await dialog.getByLabel("Priorité").selectOption("high");
    await dialog.getByRole("button", { name: "Créer la tâche" }).click();
    await expect(status(page, "Tâche créée.")).toBeVisible();

    const errors: string[] = [];
    const tech = await openAs(browser, testInfo, users.technician.email, errors);
    await tech.goto("/app/tasks");
    const task = tech.getByTestId("column-todo").getByTestId("task").filter({ hasText: t });
    await expect(task).toContainText("Haute");
    await task.getByLabel(`Statut de « Commander les joints ${t} »`).selectOption("done");
    await expect(
      tech.getByTestId("column-done").getByTestId("task").filter({ hasText: t }),
    ).toBeVisible();
    await shot("tasks", tech);
    const { data: note } = await adminClient()
      .from("ai_conductor_notifications")
      .select("type")
      .eq("user_id", users.technician.profileId)
      .eq("title", `Nouvelle tâche : Commander les joints ${t}`);
    expect(note).toEqual([{ type: "task" }]);

    await page.goto("/app/tasks?all=1");
    await page
      .getByRole("button", { name: `Supprimer la tâche : Commander les joints ${t}` })
      .click();
    await page
      .getByRole("dialog", { name: "Supprimer la tâche" })
      .getByRole("button", { name: "Supprimer la tâche" })
      .click();
    await expect(page.getByTestId("task").filter({ hasText: t })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("meetings", () => {
  test("notes become a summary, decisions and actions; chosen actions become tasks", async ({
    page,
    shot,
  }) => {
    test.skip(!desktop(page), "real AI call");
    test.setTimeout(240_000);
    const t = tag();
    await login(page, "manager");
    await page.goto("/app/meetings");
    await page.getByLabel("Réunion").fill(`Point chantier ${t}`);
    await page.getByLabel("Participants").fill("Léa, Théo");
    await page
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill(
        "Point sur la résidence Garibaldi. La fuite du 3e étage est réparée. On décide de remplacer la colonne d’eau au printemps. Théo doit commander les joints avant vendredi. Léa enverra le devis au syndic.",
      );
    await page.getByRole("button", { name: "Rédiger le compte rendu" }).click();
    await expect(page).toHaveURL(/\/app\/meetings\/[0-9a-f-]{36}$/, { timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Point chantier ${t}`);
    await expect(page.getByRole("heading", { name: "Décisions" })).toBeVisible();
    const actions = page.getByTestId("meeting-action");
    await expect(actions.first()).toBeVisible();
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expectNoHorizontalScroll(page);
    await shot("meeting");

    // Nothing became a task yet.
    const meetingId = page.url().split("/").pop()!;
    const tasksOf = async () =>
      (
        await adminClient()
          .from("ai_conductor_team_tasks")
          .select("source")
          .eq("meeting_id", meetingId)
      ).data ?? [];
    expect(await tasksOf()).toEqual([]);

    await page.getByRole("button", { name: /^Créer \d+ tâches?$/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Tâche créée").first()).toBeVisible();
    const created = await tasksOf();
    expect(created.length).toBe(count);
    expect(new Set(created.map((x) => x.source))).toEqual(new Set(["meeting"]));
    expect(await auditActions(meetingId)).toContain("meeting.summarized");
  });

  test("a recording is transcribed, then summarised", async ({ page }) => {
    test.skip(!desktop(page), "real AI call");
    test.setTimeout(240_000);
    await login(page, "technician");
    await page.goto("/app/meetings");
    await page.getByLabel("Réunion").fill(`Appel client ${tag()}`);
    await page.getByText("Enregistrement", { exact: true }).click();
    await page
      .getByTestId("meeting-audio")
      .setInputFiles(join(__dirname, "fixtures", "question-fr.wav"));
    await expect(page.getByText(/Enregistrement prêt/)).toBeVisible();
    await page.getByRole("button", { name: "Rédiger le compte rendu" }).click();
    await expect(page).toHaveURL(/\/app\/meetings\/[0-9a-f-]{36}$/, { timeout: 120_000 });
    await page.getByText("Transcription", { exact: true }).click();
    await expect(page.getByText(/dossiers/i).first()).toBeVisible();
  });
});

test.describe("recommendations", () => {
  test("a quote unanswered for a week is suggested, and handed to the assistant", async ({
    page,
  }) => {
    test.skip(!desktop(page), "writes shared rows");
    const { companyId, users } = readState();
    const t = tag();
    const caseId = `INC-${t}`;
    const admin = adminClient();
    await admin.from("ai_conductor_incidents").insert({
      id: caseId,
      reference: `INC-2026-5${String(parseInt(t.slice(0, 6), 16) % 1000).padStart(3, "0")}`,
      company_id: companyId,
      title: `Relance ${t}`,
      status: "sent_to_client",
      client_id: users.client.profileId,
      channel: "app",
    });
    await admin.from("ai_conductor_quotations").insert({
      id: `DEV-${t}`,
      reference: `DEV-E2E-${t}`,
      company_id: companyId,
      incident_id: caseId,
      client_id: users.client.profileId,
      title: "Relance",
      line_items: [{ label: "Main-d’œuvre", quantity: 1, unit_price_ht: 100 }],
      tax_rate: 20,
      subtotal_ht: 100,
      tax_amount: 20,
      total_ttc: 120,
      status: "sent_to_client",
      created_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    });
    await loginAs(page, users.manager.email);
    const reco = page.getByTestId("reco-quoteFollowUp");
    await expect(reco).toContainText("depuis plus d’une semaine");
    await reco.getByRole("button", { name: /Elle s’en occupe/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Maya" }).getByLabel("Écrivez votre message…"),
    ).toHaveValue(/Prépare un message de relance pour DEV-/);
  });
});
