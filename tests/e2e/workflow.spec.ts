import { join } from "node:path";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  loginAs,
  openAs,
  screenshot,
  test,
  type Page,
} from "./support/fixtures";

const PHOTO = join(__dirname, "..", "..", "legacy", "client", "public", "final-poster.jpg");

// Real multi-user flows against Supabase (+ one real OpenAI call): desktop only.
test.describe.configure({ mode: "serial" });
test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1440, "desktop only (multi-user flow)");

const status = (page: Page, label: string) =>
  // Generous: each round-trip to the (Tokyo) Supabase project costs ~1 s, and dev renders on demand.
  expect(
    page
      .getByRole("main")
      .locator("span", { hasText: new RegExp(`^${label}$`) })
      .first(),
  ).toBeVisible({
    timeout: 60_000,
  });

const done = (page: Page) =>
  expect(page.getByRole("status").filter({ hasText: "C’est fait." }).last()).toBeVisible();

let caseUrl = "";
let caseTitle = "";

test("client → manager → technician (AI quote) → approval → signature → job → invoice → payment", async ({
  page: client,
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  const s = readState();
  const errors: string[] = [];
  caseTitle = `Fuite plafond salle de bain ${Date.now()}`;

  await loginAs(client, s.users.client.email);

  // The manager watches the case list while the client reports.
  const manager = await openAs(browser, testInfo, s.users.manager.email, errors);
  await manager.goto("/app/cases");

  // Dev server compiles routes on first use; warm the case page before timing the flow.
  await client.goto("/app/cases/INC-WARMUP");
  await expect(client.getByText("Page introuvable")).toBeVisible({ timeout: 120_000 });

  // 1. Client reports with a photo.
  await client.goto("/app/cases/new");
  await client.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(client.getByText("Ajoutez au moins une photo.")).toBeVisible();
  await client.getByTestId("photo-input").setInputFiles(PHOTO);
  await expect(client.getByRole("img", { name: "Photos 1" })).toBeVisible();
  await client.getByLabel("Objet").fill(caseTitle);
  await client
    .getByLabel("Description")
    .fill("Tache d’humidité au plafond, gouttes près du luminaire.");
  await client.getByLabel("Adresse").fill("14 rue de Rivoli");
  await client.getByLabel("Ville").fill("Paris");
  await client.getByLabel("Urgence").selectOption("high");
  await expectNoHorizontalScroll(client);
  await screenshot(client, testInfo, "flow-01-client-report");
  await client.getByRole("button", { name: "Envoyer le signalement" }).click();
  await client.waitForURL(/\/app\/cases\/INC-[A-Z0-9]+$/);
  // The page shows the human, per-company number.
  await expect(client.getByText(/INC-\d{4}-\d{4}/).first()).toBeVisible();
  caseUrl = new URL(client.url()).pathname;
  await status(client, "Nouveau");
  await expect(client.getByRole("img", { name: "Photos 1" })).toBeVisible();
  await expect(client.getByText("Rue de Rivoli", { exact: false }).first()).toBeVisible(); // geocoded

  // 2. It appears live in the manager's list (Supabase Realtime, no reload).
  await expect(manager.getByRole("link", { name: new RegExp(caseTitle) })).toBeVisible({
    timeout: 20_000,
  });
  await manager.getByRole("link", { name: new RegExp(caseTitle) }).click();
  await manager.waitForURL(`**${caseUrl}`);

  // 3. Manager assigns the technician (map + picker).
  await expect(manager.getByRole("img", { name: "Carte des techniciens" })).toBeVisible();
  await manager.getByRole("checkbox", { name: /Théo Technicien/ }).check();
  await screenshot(manager, testInfo, "flow-02-manager-assign");
  await manager.getByRole("button", { name: /^Assigner/ }).click();
  await status(manager, "Visite technique");

  // Client ↔ team chat, live on the other side.
  await client
    .getByRole("textbox", { name: "Écrire un message…" })
    .fill("Je suis disponible demain matin.");
  await client.getByRole("button", { name: "Envoyer" }).click();
  await expect(manager.getByText("Je suis disponible demain matin.")).toBeVisible({
    timeout: 20_000,
  });

  // 4. Technician: site photo, findings, AI quote, then a deterministic total.
  const tech = await openAs(browser, testInfo, s.users.technician.email, errors);
  await tech.goto("/app/cases");
  await tech.getByRole("link", { name: new RegExp(caseTitle) }).click();
  await tech.getByTestId("site-photo-input").setInputFiles(PHOTO);
  await tech.getByRole("button", { name: "Envoyer les photos" }).click();
  await done(tech);
  await expect(tech.getByRole("img", { name: /Photos/ })).toHaveCount(2);
  await tech
    .getByLabel("Constat")
    .fill(
      "Fuite sur le raccord d’évacuation de la baignoire de l’appartement du dessus. Plafond en plaque de plâtre humide sur 1 m². Remplacement du joint et reprise du plafond.",
    );
  await tech.getByRole("button", { name: "Rédiger le devis avec l’IA" }).click();
  await expect(tech.getByRole("status").filter({ hasText: "Brouillon généré" })).toBeVisible({
    timeout: 90_000,
  });
  await expect(tech.getByLabel("Intitulé")).not.toHaveValue("");
  await expect(tech.getByTestId("devis-total")).not.toHaveText(/^0,00/);
  await screenshot(tech, testInfo, "flow-03-technician-ai-quote");
  // Keep one line at 300 € HT, 20 % VAT → 360 € TTC (under the 1 000 € threshold).
  while ((await tech.getByRole("button", { name: /^Supprimer la ligne/ }).count()) > 1) {
    await tech
      .getByRole("button", { name: /^Supprimer la ligne/ })
      .last()
      .click();
  }
  await tech.getByLabel("Qté").fill("1");
  await tech.getByLabel("PU HT").fill("300");
  await tech.getByLabel("TVA").selectOption("20");
  await expect(tech.getByTestId("devis-total")).toHaveText(/360,00/);
  await expect(tech.getByText(/Validation par le gestionnaire/)).toBeVisible();
  await tech.getByRole("button", { name: "Envoyer pour validation" }).click();
  await status(tech, "Devis à valider");

  // The client never sees a quote under internal review.
  await client.reload();
  await expect(client.getByTestId("quote-total")).toHaveCount(0);

  // 5. Manager approves (live update of his open page).
  await expect(manager.getByRole("button", { name: "Valider et envoyer au client" })).toBeVisible({
    timeout: 20_000,
  });
  await manager.getByRole("button", { name: "Valider et envoyer au client" }).click();
  await status(manager, "Devis envoyé au client");

  // 6. Client signs from "Mes devis" with DocuSign. Without DocuSign keys the
  // button says so and is disabled; the signed envelope is then recorded the
  // way the Connect webhook does (status, quote, request).
  await client.goto("/app/quotes");
  await expect(client.getByTestId("quote-total").first()).toHaveText(/360,00/);
  await screenshot(client, testInfo, "flow-04-client-quote");
  const caseId = caseUrl.split("/").pop() as string;
  if (process.env.DOCUSIGN_INTEGRATION_KEY) {
    await expect(client.getByRole("button", { name: "Signer le devis" }).first()).toBeEnabled();
  } else {
    await expect(client.getByRole("button", { name: "Signer le devis" }).first()).toBeDisabled();
    await expect(client.getByText("Signature électronique non configurée").first()).toBeVisible();
  }
  {
    const admin = adminClient();
    const { data: c } = await admin
      .from("ai_conductor_incidents")
      .select("quotation_id, company_id")
      .eq("id", caseId)
      .single();
    const now = new Date().toISOString();
    await admin.from("ai_conductor_signature_requests").insert({
      company_id: c!.company_id,
      document_type: "quotation",
      document_id: c!.quotation_id!,
      incident_id: caseId,
      envelope_id: `e2e-${caseId}`,
      signer_id: s.users.client.profileId,
      signer_email: s.users.client.email,
      status: "completed",
      completed_at: now,
      events: [{ status: "completed", at: now, source: "webhook" }],
    });
    await admin
      .from("ai_conductor_quotations")
      .update({ status: "accepted", signed_at: now })
      .eq("id", c!.quotation_id!);
    await admin
      .from("ai_conductor_incidents")
      .update({ status: "client_signed" })
      .eq("id", caseId)
      .eq("status", "sent_to_client");
  }
  await client.goto(caseUrl);
  await status(client, "Devis signé");

  // 7. Manager schedules; technician starts and completes → invoice.
  await expect(manager.getByRole("button", { name: "Planifier" })).toBeVisible({ timeout: 20_000 });
  await manager.getByRole("button", { name: "Planifier" }).click();
  await status(manager, "Intervention planifiée");
  await tech.reload();
  await tech.getByRole("button", { name: "Démarrer l’intervention" }).click();
  await status(tech, "En cours");
  await tech.getByRole("button", { name: "Terminer et facturer" }).click();
  await tech
    .getByRole("dialog", { name: "Terminer et facturer" })
    .getByRole("button", { name: "Confirmer" })
    .click();
  await status(tech, "Facturé");

  // Team chat is never shown to the client.
  await expect(tech.getByRole("heading", { name: "Discussion d’équipe" })).toBeVisible();
  await client.reload();
  await expect(client.getByRole("heading", { name: "Discussion d’équipe" })).toHaveCount(0);

  // 8. Client uploads proof of payment; accountant confirms → case closed.
  await client.goto("/app/invoices");
  const receipt = client.locator('[data-testid^="receipt-input-"]').first();
  await receipt.setInputFiles(PHOTO);
  await client.getByRole("button", { name: "Envoyer un justificatif" }).first().click();
  await done(client);
  await expect(client.getByText("Justificatif à vérifier").first()).toBeVisible();
  await screenshot(client, testInfo, "flow-05-client-invoice");

  const accountant = await openAs(browser, testInfo, s.users.accountant.email, errors);
  await accountant.goto("/app/invoices");
  await expect(accountant.getByRole("heading", { name: "Finance" })).toBeVisible();
  await screenshot(accountant, testInfo, "flow-06-accountant-finance");
  await accountant.getByRole("button", { name: "Confirmer le paiement" }).first().click();
  await accountant
    .getByRole("dialog", { name: "Confirmer le paiement" })
    .getByRole("button", { name: "Confirmer" })
    .click();
  await done(accountant);
  await manager.goto(caseUrl);
  await status(manager, "Clôturé");
  await screenshot(manager, testInfo, "flow-07-case-closed");

  // Notifications were delivered along the way.
  await client.goto("/app/notifications");
  await expect(client.getByText("Un technicien est assigné à votre dossier").first()).toBeVisible();

  // Every step is in the audit trail.
  const { data: audit } = await adminClient()
    .from("ai_conductor_audit_log")
    .select("action")
    .eq("entity_id", caseUrl.split("/").pop() as string);
  const actions = (audit ?? []).map((a) => a.action as string);
  for (const a of [
    "incident.report",
    "incident.assign",
    "incident.submit_devis",
    "incident.approve_devis",
    // client_accept is written by the DocuSign webhook (simulated above without keys).
    ...(process.env.DOCUSIGN_INTEGRATION_KEY ? ["incident.client_accept"] : []),
    "incident.schedule",
    "incident.start",
    "incident.complete",
    "incident.close",
  ]) {
    expect(actions).toContain(a);
  }
  expect(errors).toEqual([]);
});

test("isolation: other client / unassigned technician / client on staff pages", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const s = readState();
  const errors: string[] = [];

  const client2 = await openAs(browser, testInfo, s.client2.email, errors);
  await client2.goto(caseUrl);
  await expect(client2.getByText("Page introuvable")).toBeVisible();
  await client2.goto("/app/cases?filter=all");
  await expect(client2.getByText(caseTitle)).toHaveCount(0);

  const tech2 = await openAs(browser, testInfo, s.technician2.email, errors);
  await tech2.goto(caseUrl);
  await expect(tech2.getByText("Page introuvable")).toBeVisible();

  const client = await openAs(browser, testInfo, s.users.client.email, errors);
  for (const path of ["/app/approvals", "/app/technicians", "/app/company", "/app/directory"]) {
    await client.goto(path);
    await expect(client.getByText("Page introuvable")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("director threshold: settings route a quote to the director, managers cannot approve it", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const s = readState();
  const errors: string[] = [];
  const title = `Dégât des eaux parking ${Date.now()}`;

  const director = await openAs(browser, testInfo, s.users.director.email, errors);
  await director.goto("/app/company");
  await director.getByLabel("Seuil de validation dirigeant (€ TTC)").fill("500");
  await director.getByRole("button", { name: "Enregistrer" }).nth(1).click();
  await expect(
    director.getByRole("status").filter({ hasText: "Modifications enregistrées." }),
  ).toBeVisible();

  try {
    // Phone request logged by the manager (no photo needed for staff).
    const manager = await openAs(browser, testInfo, s.users.manager.email, errors);
    await manager.goto("/app/cases/new");
    await manager.getByLabel("Objet").fill(title);
    await manager.getByLabel("Adresse").fill("5 place Vendôme");
    await manager.getByLabel("Ville").fill("Paris");
    await manager.getByLabel("Canal").selectOption("phone");
    await manager.getByLabel("Nom du demandeur").fill("M. Durand");
    await manager.getByRole("button", { name: "Envoyer le signalement" }).click();
    await manager.waitForURL(/\/app\/cases\/INC-/);
    const url = new URL(manager.url()).pathname;
    await manager.getByRole("checkbox", { name: /Ines Technicienne/ }).check();
    await manager.getByRole("button", { name: /^Assigner/ }).click();
    await status(manager, "Visite technique");

    const tech2 = await openAs(browser, testInfo, s.technician2.email, errors);
    await tech2.goto(url);
    await tech2.getByLabel("Intitulé").fill("Reprise étanchéité");
    await tech2.getByLabel("Désignation").fill("Main-d’œuvre (h)");
    await tech2.getByLabel("Qté").fill("10");
    await tech2.getByLabel("PU HT").fill("55");
    await expect(tech2.getByTestId("devis-total")).toHaveText(/660,00/);
    await expect(tech2.getByText(/Validation par le dirigeant/)).toBeVisible();
    await tech2.getByRole("button", { name: "Envoyer pour validation" }).click();
    await status(tech2, "Devis — validation dirigeant");

    await manager.reload();
    await expect(manager.getByRole("button", { name: "Valider et envoyer au client" })).toHaveCount(
      0,
    );

    await director.goto("/app/approvals");
    await director.getByRole("link", { name: new RegExp(title) }).click();
    await screenshot(director, testInfo, "flow-08-director-approval");
    await director.getByRole("button", { name: "Valider et envoyer au client" }).click();
    await status(director, "Devis envoyé au client");
  } finally {
    await director.goto("/app/company");
    await director.getByLabel("Seuil de validation dirigeant (€ TTC)").fill("1000");
    await director.getByRole("button", { name: "Enregistrer" }).nth(1).click();
    await expect(
      director.getByRole("status").filter({ hasText: "Modifications enregistrées." }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
