import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  login,
  openAs,
  settled,
  test,
  type Page,
} from "./support/fixtures";

// Phase 6 — payments and receipt review, service orders through the approval
// chain, reports with charts, FEC / CSV exports, accounting connectors (stubs).

const DOCUSIGN = Boolean(process.env.DOCUSIGN_INTEGRATION_KEY);
const PHOTO = join(__dirname, "..", "..", "legacy", "client", "public", "final-poster.jpg");
const desktop = (page: Page) => (page.viewportSize()?.width ?? 0) === 1440;
const tag = () => randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
const year = () =>
  Number(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }).slice(0, 4));

async function auditActions(entityId: string) {
  const { data } = await adminClient()
    .from("ai_conductor_audit_log")
    .select("action")
    .eq("entity_id", entityId);
  return (data ?? []).map((a) => a.action as string);
}

async function newInvoice(amount: number, daysUntilDue = 30) {
  const { users, companyId } = readState();
  const t = tag();
  const id = `FAC-${t}`;
  const { error } = await adminClient()
    .from("ai_conductor_invoices")
    .insert({
      id,
      reference: `FAC-E2E-${t}`,
      company_id: companyId,
      client_id: users.client.profileId,
      title: `Réparation ${t}`,
      amount,
      status: "unpaid",
      issued_at: new Date(Date.now() - 80 * 86_400_000).toISOString(),
      due_at: new Date(Date.now() + daysUntilDue * 86_400_000).toISOString(),
    });
  if (error) throw error;
  return { id, reference: `FAC-E2E-${t}`, title: `Réparation ${t}` };
}

/** Signs in as another role in the same page (drops the current session first). */
async function switchTo(page: Page, role: Parameters<typeof login>[1]) {
  await page.context().clearCookies();
  await login(page, role);
}

const done = (page: Page) =>
  expect(page.getByRole("status").filter({ hasText: "C’est fait." }).first()).toBeVisible();

test.describe("payments", () => {
  test("partial payment, refused receipt, then the receipt settles the invoice", async ({
    page,
    browser,
    shot,
  }, testInfo) => {
    test.skip(!desktop(page), "writes shared rows");
    test.setTimeout(240_000);
    const { users } = readState();
    const inv = await newInvoice(360);
    const errors: string[] = [];

    // 1. The accountant records a first, partial payment.
    await login(page, "accountant");
    await page.goto("/app/invoices");
    const row = page.locator("tr").filter({ hasText: inv.reference });
    await expect(row.getByTestId(`remaining-${inv.reference}`)).toHaveText(/360,00/);
    await row.getByRole("button", { name: "Confirmer le paiement" }).click();
    let dialog = page.getByRole("dialog", { name: "Confirmer le paiement" });
    await expect(dialog.getByLabel("Montant reçu (€)")).toHaveValue("360.00");
    await dialog.getByLabel("Montant reçu (€)").fill("999");
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Le montant dépasse ce qui reste à payer." }),
    ).toBeVisible();
    await dialog.getByLabel("Montant reçu (€)").fill("160");
    await dialog.getByLabel("Mode de paiement").selectOption("cheque");
    await dialog.getByLabel(/Référence/).fill("CHQ 0042");
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await expect(dialog).toBeHidden();
    await expect(row.getByTestId(`remaining-${inv.reference}`)).toHaveText(/200,00/);

    // 2. The client sends a receipt; the accountant refuses it with a reason.
    const client = await openAs(browser, testInfo, users.client.email, errors);
    await client.goto("/app/invoices");
    await settled(client);
    // The innermost card of this invoice.
    const card = client
      .locator("section")
      .filter({ has: client.getByRole("heading", { name: `Facture ${inv.reference}` }) })
      .last();
    await expect(card.getByTestId("invoice-settled")).toContainText("160,00");
    await card.locator('[data-testid^="receipt-input-"]').setInputFiles(PHOTO);
    await card.getByRole("button", { name: "Envoyer un justificatif" }).click();
    await done(client);
    await expect(card.getByText("Justificatif à vérifier").first()).toBeVisible();

    await page.reload();
    await settled(page);
    await expect(row.getByRole("link", { name: "Voir le justificatif" })).toBeVisible();
    await row.getByRole("button", { name: "Refuser le justificatif" }).click();
    dialog = page.getByRole("dialog", { name: "Refuser le justificatif" });
    await dialog.getByLabel(/Motif du refus/).fill("Montant illisible sur le scan");
    await dialog.getByRole("button", { name: "Refuser le justificatif" }).click();
    await expect(dialog).toBeHidden();

    await client.reload();
    await settled(client);
    await expect(card.getByRole("note")).toHaveText(
      "Justificatif refusé : Montant illisible sur le scan",
    );

    // 3. A readable receipt: the accountant records the rest, the invoice is paid.
    await card.locator('[data-testid^="receipt-input-"]').setInputFiles(PHOTO);
    await card.getByRole("button", { name: "Envoyer un justificatif" }).click();
    await done(client);
    await page.reload();
    await settled(page);
    await row.getByRole("button", { name: "Confirmer le paiement" }).click();
    dialog = page.getByRole("dialog", { name: "Confirmer le paiement" });
    await expect(dialog.getByLabel("Montant reçu (€)")).toHaveValue("200.00");
    await shot("payment-dialog");
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("Payée");

    const db = adminClient();
    const { data: payments } = await db
      .from("ai_conductor_payments")
      .select("amount, method, status, source, reference")
      .eq("invoice_id", inv.id)
      .order("created_at");
    expect(payments).toEqual([
      {
        amount: 160,
        method: "cheque",
        status: "verified",
        source: "manual",
        reference: "CHQ 0042",
      },
      { amount: 200, method: "transfer", status: "verified", source: "receipt", reference: null },
    ]);
    const { data: invoice } = await db
      .from("ai_conductor_invoices")
      .select("status, paid_at")
      .eq("id", inv.id)
      .single();
    expect(invoice?.status).toBe("paid");
    expect(invoice?.paid_at).not.toBeNull();
    expect(await auditActions(inv.id)).toEqual(
      expect.arrayContaining([
        "invoice.payment",
        "invoice.receipt",
        "invoice.receipt_rejected",
        "invoice.paid",
      ]),
    );

    // The payments list, and what the client was told.
    await page.goto("/app/payments");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encaissements");
    await expect(page.locator("tr").filter({ hasText: inv.reference })).toHaveCount(2);
    await expectNoHorizontalScroll(page);
    await shot("payments");
    await client.goto("/app/notifications");
    await settled(client);
    for (const title of [
      `Paiement partiel reçu — ${inv.reference}`,
      `Justificatif refusé — ${inv.reference}`,
      `Paiement reçu — ${inv.reference}`,
    ])
      await expect(client.getByText(title).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("clients and technicians cannot record payments or see the payments list", async ({
    page,
  }) => {
    for (const role of ["client", "technician"] as const) {
      await switchTo(page, role);
      await page.goto("/app/payments");
      await expect(page.getByText("Page introuvable")).toBeVisible();
    }
  });
});

test.describe("service orders", () => {
  test("draft → funds check → accountant review → DocuSign → sent, with a refusal", async ({
    page,
    browser,
    shot,
  }, testInfo) => {
    test.skip(!desktop(page), "writes shared rows");
    test.setTimeout(300_000);
    const { users, companyId } = readState();
    const t = tag();
    const title = `Réfection toiture ${t}`;
    const errors: string[] = [];

    // 1. The manager drafts it.
    await login(page, "manager");
    await page.goto("/app/service-orders");
    await page.getByRole("button", { name: "Nouvel ordre de service" }).click();
    const form = page.getByRole("dialog", { name: "Nouvel ordre de service" });
    await form.getByLabel("Intitulé des travaux").fill(title);
    await form.getByLabel("Prestataire", { exact: true }).fill("Couverture Dubois");
    await form.getByLabel("E-mail du prestataire").fill("devis@couverture-dubois.example");
    await form.getByLabel(/SIRET du prestataire/).fill("123");
    await form.getByLabel("Montant HT (€)").fill("1500");
    await form.getByLabel("TVA").selectOption("10");
    await form.getByLabel("Description des travaux").fill("Remplacement de 40 m² de tuiles.");
    await form.getByRole("button", { name: "Créer le brouillon" }).click();
    await expect(form.getByText("Le SIRET comporte 14 chiffres.")).toBeVisible();
    await form.getByLabel(/SIRET du prestataire/).fill("");
    await form.getByRole("button", { name: "Créer le brouillon" }).click();
    await expect(page).toHaveURL(/\/app\/service-orders\/OS-[A-Z0-9]+$/);
    await settled(page);
    const id = page.url().split("/").pop() as string;
    const { data: order } = await adminClient()
      .from("ai_conductor_service_orders")
      .select("reference, total_ttc, status, company_id")
      .eq("id", id)
      .single();
    expect(order?.reference).toMatch(new RegExp(`^OS-${year()}-\\d{4}$`));
    expect(Number(order?.total_ttc)).toBe(1650);
    expect(order?.company_id).toBe(companyId);
    await expect(page.getByTestId("order-total")).toContainText("1 650,00");
    await expect(page.getByRole("button", { name: "Fonds disponibles" })).toHaveCount(0);

    const pdf = await page.request.get(`/api/documents/service-order/${id}`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    const decideAs = async (who: Page, button: string, note?: string) => {
      await who.getByRole("button", { name: button }).click();
      const dialog = who.getByRole("dialog", { name: button });
      if (note) await dialog.getByRole("textbox").fill(note);
      await dialog.getByRole("button", { name: "Confirmer" }).click();
      await expect(dialog).toBeHidden();
    };
    const badge = (who: Page, text: string) =>
      expect(who.locator(".page-header").getByText(text, { exact: true })).toBeVisible();

    await decideAs(page, "Soumettre");
    await badge(page, "Vérification des fonds");

    // 2. The director checks the funds; a first refusal needs a reason.
    const director = await openAs(browser, testInfo, users.director.email, errors);
    await director.goto(`/app/service-orders/${id}`);
    await settled(director);
    await expect(director.getByTestId("funds-check")).toContainText("Disponible");
    await director.getByRole("button", { name: "Renvoyer en brouillon" }).click();
    const reject = director.getByRole("dialog", { name: "Renvoyer en brouillon" });
    await expect(reject.getByRole("button", { name: "Confirmer" })).toBeDisabled();
    await reject.getByRole("textbox").fill("Joindre le devis du couvreur");
    await reject.getByRole("button", { name: "Confirmer" }).click();
    await expect(reject).toBeHidden();
    await badge(director, "Brouillon");
    await expect(director.getByText("Joindre le devis du couvreur")).toBeVisible();

    await page.reload();
    await settled(page);
    await decideAs(page, "Soumettre");
    await director.reload();
    await settled(director);
    await shot("service-order-funds", director);
    await decideAs(director, "Fonds disponibles");
    await badge(director, "Revue comptable");

    // 3. The accountant reviews it (and only the accountant / admin can).
    await expect(director.getByRole("button", { name: "Valider (comptabilité)" })).toHaveCount(0);
    const accountant = await openAs(browser, testInfo, users.accountant.email, errors);
    await accountant.goto("/app/service-orders");
    await settled(accountant);
    await expect(accountant.getByText(/ordres? attend/)).toBeVisible();
    await accountant.locator(`[data-order="${order!.reference}"]`).getByRole("link").click();
    await settled(accountant);
    await decideAs(accountant, "Valider (comptabilité)", "Imputé sur le budget entretien");
    await badge(accountant, "Signature");

    // 4. The director signs with DocuSign; the supplier is copied on the envelope.
    await director.reload();
    await settled(director);
    const sign = director.getByRole("button", { name: "Signer l’ordre de service" });
    if (DOCUSIGN) await expect(sign).toBeEnabled();
    else {
      await expect(sign).toBeDisabled();
      await expect(director.getByRole("note")).toHaveText("Signature électronique non configurée");
      // What the Connect webhook records once the director has signed.
      const db = adminClient();
      const at = new Date().toISOString();
      await db
        .from("ai_conductor_service_orders")
        .update({ status: "sent", signed_by: users.director.profileId, signed_at: at, sent_at: at })
        .eq("id", id);
      await db.from("ai_conductor_approval_steps").insert({
        company_id: companyId,
        entity_type: "service_order",
        entity_id: id,
        from_status: "esign",
        to_status: "sent",
        decision: "sign",
        actor_id: users.director.profileId,
        actor_role: "director",
      });
      await director.reload();
      await settled(director);
      await badge(director, "Envoyé");
      await expect(director.getByText("Signé et envoyé au prestataire")).toBeVisible();
    }
    await shot("service-order-history", director);

    const { data: steps } = await adminClient()
      .from("ai_conductor_approval_steps")
      .select("decision, from_status, to_status, actor_role, note")
      .eq("entity_id", id)
      .order("created_at");
    expect(steps?.slice(0, 5)).toEqual([
      {
        decision: "submit",
        from_status: "draft",
        to_status: "funds_check",
        actor_role: "manager",
        note: "",
      },
      {
        decision: "reject",
        from_status: "funds_check",
        to_status: "draft",
        actor_role: "director",
        note: "Joindre le devis du couvreur",
      },
      {
        decision: "submit",
        from_status: "draft",
        to_status: "funds_check",
        actor_role: "manager",
        note: "",
      },
      {
        decision: "approve",
        from_status: "funds_check",
        to_status: "accountant_review",
        actor_role: "director",
        note: "",
      },
      {
        decision: "approve",
        from_status: "accountant_review",
        to_status: "esign",
        actor_role: "accountant",
        note: "Imputé sur le budget entretien",
      },
    ]);
    expect(await auditActions(id)).toEqual(
      expect.arrayContaining([
        "service_order.created",
        "service_order.submit",
        "service_order.reject",
        "service_order.approve",
      ]),
    );
    // Each step told the next people in the chain.
    await page.goto("/app/notifications");
    await expect(
      page.getByText(`Ordre de service ${order!.reference} renvoyé en brouillon`).first(),
    ).toBeVisible();
    await accountant.goto("/app/notifications");
    await settled(accountant);
    await expect(
      accountant.getByText(`Ordre de service ${order!.reference} à valider (comptabilité)`).first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("never visible to clients or technicians", async ({ page }) => {
    const { data: some } = await adminClient()
      .from("ai_conductor_service_orders")
      .select("id")
      .eq("company_id", readState().companyId)
      .limit(1);
    for (const role of ["client", "technician"] as const) {
      await switchTo(page, role);
      await page.goto("/app/service-orders");
      await expect(page.getByText("Page introuvable")).toBeVisible();
      if (some?.[0])
        expect(
          (await page.request.get(`/api/documents/service-order/${some[0].id}`)).status(),
        ).toBe(404);
    }
  });

  test("the list reads well on every screen", async ({ page, shot }) => {
    await login(page, "director");
    await page.goto("/app/service-orders");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ordres de service");
    await expectNoHorizontalScroll(page);
    await shot("service-orders");
  });
});

test.describe("reports and exports", () => {
  test("charts, ageing and conversion from real rows; tooltips by keyboard", async ({
    page,
    shot,
  }) => {
    const { companyId, users } = readState();
    if (desktop(page)) {
      // An overdue invoice partly paid, and a quote accepted this year.
      const inv = await newInvoice(500, -45);
      const db = adminClient();
      await db.from("ai_conductor_payments").insert({
        company_id: companyId,
        invoice_id: inv.id,
        amount: 125,
        status: "verified",
        method: "transfer",
        paid_at: new Date().toISOString(),
      });
      // Quotes are seen through their case (RLS): attach one.
      const t = tag();
      const { error: caseError } = await db.from("ai_conductor_incidents").insert({
        id: `INC-${t}`,
        reference: `INC-E2E-${t}`,
        company_id: companyId,
        client_id: users.client.profileId,
        title: `Infiltration ${t}`,
        status: "client_signed",
      });
      expect(caseError).toBeNull();
      const { error: quoteError } = await db.from("ai_conductor_quotations").insert({
        id: `DEV-${t}`,
        reference: `DEV-E2E-${t}`,
        company_id: companyId,
        incident_id: `INC-${t}`,
        client_id: users.client.profileId,
        title: `Devis ${t}`,
        status: "accepted",
        total_ttc: 900,
        sent_at: new Date().toISOString(),
      });
      expect(quoteError).toBeNull();
    }
    await login(page, "accountant");
    await page.goto("/app/reports");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rapports");
    const revenue = page.getByRole("img", { name: `Facturé et encaissé — ${year()}` });
    await expect(revenue).toBeVisible();
    await revenue.locator("rect[tabindex]").nth(new Date().getMonth()).focus();
    await expect(page.getByTestId("chart-tooltip")).toContainText("Encaissé");
    const ageing = page.getByRole("list", { name: "Balance âgée des créances" });
    await expect(ageing.locator("li")).toHaveCount(5);
    if (desktop(page)) await expect(ageing.locator('[data-bucket="d60"]')).toContainText("375,00");
    if (desktop(page)) {
      await expect(page.getByText(/acceptés : [1-9]/)).toBeVisible();
      await expect(page.getByRole("img", { name: `Devis — ${year()}` })).toBeVisible();
    }
    await page.getByText("Voir les données").first().click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot("reports");
  });

  test("FEC and CSV exports for finance roles only", async ({ page }) => {
    const y = year();
    await login(page, "accountant");
    const fec = await page.request.get(`/api/exports/fec?year=${y}`);
    expect(fec.status()).toBe(200);
    expect(fec.headers()["content-disposition"]).toContain(`FEC${y}1231.txt`);
    const lines = (await fec.text()).split("\r\n").filter(Boolean);
    expect(lines[0].split("\t")).toHaveLength(18);
    expect(lines[0].startsWith("JournalCode\tJournalLib\tEcritureNum")).toBe(true);
    for (const l of lines) expect(l.split("\t")).toHaveLength(18);

    const csv = await page.request.get(`/api/exports/invoices?year=${y}`);
    expect(csv.status()).toBe(200);
    const text = await csv.text();
    expect(text.replace(/^﻿/, "").startsWith("Facture;Date;Échéance;Client")).toBe(true);
    expect((await page.request.get(`/api/exports/payments?year=${y}`)).status()).toBe(200);
    expect((await page.request.get(`/api/exports/fec?year=${y + 1}`)).status()).toBe(400);
    expect((await page.request.get("/api/exports/ledger")).status()).toBe(404);

    for (const role of ["manager", "client", "technician"] as const) {
      await switchTo(page, role);
      expect((await page.request.get(`/api/exports/fec?year=${y}`)).status()).toBe(403);
      await page.goto("/app/reports");
      await expect(page.getByText("Page introuvable")).toBeVisible();
    }
  });
});

test.describe("accounting connectors", () => {
  test("Pennylane and Qonto are declared, not yet connectable", async ({ page, shot }) => {
    await login(page, "accountant");
    await page.goto("/app/settings/integrations");
    for (const id of ["pennylane", "qonto"]) {
      const card = page.getByTestId(`provider-${id}`);
      await expect(card.getByText("Bientôt", { exact: true })).toBeVisible();
      await expect(card.getByRole("button", { name: "Connecter" })).toBeDisabled();
      await expect(card.getByRole("note")).toContainText("bientôt disponible");
    }
    await expectNoHorizontalScroll(page);
    await shot("integrations-accounting");
    await switchTo(page, "manager");
    await page.goto("/app/settings/integrations");
    await expect(page.getByTestId("provider-pennylane")).toHaveCount(0);
  });
});
