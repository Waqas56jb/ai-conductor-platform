import { randomUUID } from "node:crypto";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  login,
  loginAs,
  test,
  type Page,
} from "./support/fixtures";

// Feedback round 1 — D (DocuSign), E (smart inbox, reminders, PWA) and
// F (approval gates, isolation, audit). Real Supabase; desktop only for the
// flows that write shared rows, every viewport for the pages themselves.

const ESIGN = Boolean(process.env.DOCUSIGN_INTEGRATION_KEY && process.env.DOCUSIGN_WEBHOOK_SECRET);
const desktop = (page: Page) => (page.viewportSize()?.width ?? 0) === 1440;
const tag = () => randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

async function auditActions(entityId: string) {
  const { data } = await adminClient()
    .from("ai_conductor_audit_log")
    .select("action")
    .eq("entity_id", entityId);
  return (data ?? []).map((a) => a.action as string);
}

/** A case whose quote waits for the client's signature. */
async function quoteToSign() {
  const { companyId, users } = readState();
  const t = tag();
  const caseId = `INC-${t}`;
  const quoteId = `DEV-${t}`;
  const admin = adminClient();
  const { error: e1 } = await admin.from("ai_conductor_incidents").insert({
    id: caseId,
    reference: `INC-2026-7${String(parseInt(t.slice(0, 6), 16) % 1000).padStart(3, "0")}`,
    company_id: companyId,
    title: `Devis à signer ${t}`,
    status: "sent_to_client",
    client_id: users.client.profileId,
    hired_tech_ids: [users.technician.profileId],
    channel: "app",
    building_address: "12 rue Garibaldi",
    city: "Lyon",
  });
  expect(e1).toBeNull();
  const { error: e2 } = await admin.from("ai_conductor_quotations").insert({
    id: quoteId,
    reference: `DEV-E2E-${t}`,
    company_id: companyId,
    incident_id: caseId,
    client_id: users.client.profileId,
    tech_ids: [users.technician.profileId],
    title: `Remplacement de joint ${t}`,
    summary: "Remplacement du joint de la colonne d’eau.",
    line_items: [{ label: "Joint et main-d’œuvre", quantity: 1, unit_price_ht: 300 }],
    tax_rate: 20,
    subtotal_ht: 300,
    tax_amount: 60,
    total_ttc: 360,
    status: "sent_to_client",
  });
  expect(e2).toBeNull();
  await admin.from("ai_conductor_incidents").update({ quotation_id: quoteId }).eq("id", caseId);
  return { caseId, quoteId, t };
}

test.describe("D — electronic signature", () => {
  test("client: sign with DocuSign, download the PDF, decline only after confirming", async ({
    page,
    shot,
  }) => {
    test.skip(!desktop(page), "writes shared rows");
    const { caseId, quoteId, t } = await quoteToSign();
    await login(page, "client");
    await page.goto("/app/quotes");
    const card = page.locator("[data-quote]", { hasText: t });
    const sign = card.getByRole("button", { name: "Signer le devis" });
    await expect(sign).toBeVisible();
    if (ESIGN) {
      await expect(sign).toBeEnabled();
    } else {
      // No keys: said plainly, and the action cannot be used.
      await expect(sign).toBeDisabled();
      await expect(card.getByTestId("esign-not-configured")).toHaveText(
        "Signature électronique non configurée",
      );
    }
    await shot("quote-signature");

    // Our generated PDF (what DocuSign receives).
    const pdf = await page.request.get(`/api/quotes/${quoteId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Declining is confirmed first; cancelling the dialog changes nothing.
    await card.getByRole("button", { name: "Refuser", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Refuser le devis" });
    await dialog.getByRole("button", { name: "Annuler" }).click();
    const admin = adminClient();
    const before = await admin
      .from("ai_conductor_incidents")
      .select("status")
      .eq("id", caseId)
      .single();
    expect(before.data?.status).toBe("sent_to_client");
    await card.getByRole("button", { name: "Refuser", exact: true }).click();
    await dialog.getByRole("button", { name: "Refuser" }).click();
    await expect
      .poll(
        async () =>
          (await admin.from("ai_conductor_incidents").select("status").eq("id", caseId).single())
            .data?.status,
      )
      .toBe("site_visit");
    expect(await auditActions(caseId)).toContain("incident.client_decline");
  });

  test("webhook: refused unless configured and HMAC-signed", async ({ request }) => {
    const res = await request.post("/api/webhooks/docusign", {
      data: { event: "envelope-completed", data: { envelopeId: "00000000-fake" } },
      headers: { "x-docusign-signature-1": "forged" },
    });
    expect(res.status()).toBe(ESIGN ? 401 : 503);
  });
});

test.describe("E — smart inbox", () => {
  test("tabs filter by priority, digest groups today, a rule is only applied once accepted", async ({
    page,
    shot,
  }) => {
    test.skip(!desktop(page), "writes shared rows");
    const { companyId, users } = readState();
    const admin = adminClient();
    const me = users.manager.profileId;
    await admin.from("ai_conductor_notifications").delete().eq("user_id", me);
    await admin.from("ai_conductor_priority_rules").delete().eq("user_id", me);
    const t = tag();
    const rows = [
      { type: "reminder", priority: "urgent", source: "call", title: `Rappeler le syndic ${t}` },
      { type: "invoice", priority: "important", source: "system", title: `Facture A ${t}` },
      { type: "invoice", priority: "important", source: "system", title: `Facture B ${t}` },
      { type: "invoice", priority: "important", source: "system", title: `Facture C ${t}` },
      { type: "message", priority: "digest", source: "system", title: `Message 1 ${t}` },
      { type: "message", priority: "digest", source: "system", title: `Message 2 ${t}` },
    ];
    const { error } = await admin
      .from("ai_conductor_notifications")
      .insert(rows.map((r) => ({ ...r, user_id: me, company_id: companyId, body: "" })));
    expect(error).toBeNull();

    await login(page, "manager");
    await page.goto("/app/notifications");
    await expect(page.getByRole("tab", { name: "Urgent (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const visible = page.getByRole("tabpanel").filter({ visible: true }).getByTestId("inbox-item");
    await expect(visible).toHaveCount(1);
    await expect(visible.first()).toContainText(`Rappeler le syndic ${t}`);
    await page.getByRole("tab", { name: "Important (3)" }).click();
    await expect(visible).toHaveCount(3);
    await page.getByRole("tab", { name: "Résumé (2)" }).click();
    await expect(page.getByText("2 notifications · messages")).toBeVisible();
    await expect(visible).toHaveCount(2);
    await expectNoHorizontalScroll(page);
    await shot("smart-inbox-digest");

    // Two manual moves of invoices to Urgent → a rule is suggested, not applied.
    await page.getByRole("tab", { name: "Important (3)" }).click();
    for (const name of ["A", "B"]) {
      await page.getByLabel(`Priorité de « Facture ${name} ${t} »`).selectOption("urgent");
      await expect(page.getByRole("tab", { name: /^Urgent/ })).toHaveText(/Urgent \((2|3)\)/);
    }
    const suggestion = page.getByTestId("rule-suggestion");
    await expect(suggestion).toContainText("Toujours classer les factures urgentes ?");
    const { data: pending } = await admin
      .from("ai_conductor_priority_rules")
      .select("approved, priority, condition")
      .eq("user_id", me);
    expect(pending).toEqual([
      { approved: false, priority: "urgent", condition: { type: "invoice" } },
    ]);
    // Facture C was not moved and stays Important until the rule is accepted.
    await expect(page.getByRole("tab", { name: "Important (1)" })).toBeVisible();
    await shot("smart-inbox-rule");

    await suggestion.getByRole("button", { name: "Accepter" }).click();
    await expect(page.getByRole("tab", { name: "Urgent (4)" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Important (0)" })).toBeVisible();
    const actions = await admin
      .from("ai_conductor_audit_log")
      .select("action")
      .eq("actor_id", me)
      .in("action", ["notification.priority_overridden", "notification.rule_accepted"]);
    expect(new Set((actions.data ?? []).map((a) => a.action)).size).toBe(2);

    // A refused suggestion is simply gone.
    await admin.from("ai_conductor_priority_rules").insert({
      user_id: me,
      company_id: companyId,
      condition: { keyword: "contrat" },
      priority: "urgent",
      label: "Toujours marquer les contrats à échéance aujourd’hui comme urgents ?",
      source: "assistant",
    });
    await page.reload();
    await page.getByTestId("rule-suggestion").getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByTestId("rule-suggestion")).toHaveCount(0);
    const { count } = await admin
      .from("ai_conductor_priority_rules")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me)
      .contains("condition", { keyword: "contrat" });
    expect(count).toBe(0);
  });
});

test.describe("E — reminders", () => {
  test("from a case and from the page; the cron fires due ones in-app", async ({
    page,
    request,
    shot,
  }) => {
    test.skip(!desktop(page), "writes shared rows");
    const { companyId, users } = readState();
    const admin = adminClient();
    const me = users.manager.profileId;
    const { caseId } = await quoteToSign();

    await login(page, "manager");
    await page.goto(`/app/cases/${caseId}`);
    await page.getByRole("button", { name: "Nouveau rappel" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouveau rappel" });
    await dialog.getByLabel("Type").selectOption("call");
    await dialog.getByLabel("Intitulé").fill("Appeler le client pour le devis");
    await dialog.getByRole("button", { name: "Programmer le rappel" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rappel programmé." })).toBeVisible();
    const { data: fromCase } = await admin
      .from("ai_conductor_reminders")
      .select("kind, incident_id, status")
      .eq("user_id", me)
      .eq("incident_id", caseId);
    expect(fromCase).toEqual([{ kind: "call", incident_id: caseId, status: "scheduled" }]);

    await page.goto("/app/reminders");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rappels");
    await expect(
      page.getByTestId("reminder").filter({ hasText: "Appeler le client" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot("reminders");

    // Due reminder → cron → urgent in-app notification (push too, when subscribed).
    const t = tag();
    await admin.from("ai_conductor_reminders").insert({
      company_id: companyId,
      user_id: me,
      kind: "meeting",
      title: `Réunion de chantier ${t}`,
      due_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
    const run = await request.get("/api/cron/reminders", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(run.status()).toBe(200);
    expect((await run.json()).sent).toBeGreaterThanOrEqual(1);
    const { data: fired } = await admin
      .from("ai_conductor_notifications")
      .select("priority, source, type")
      .eq("user_id", me)
      .eq("title", `Réunion de chantier ${t}`);
    expect(fired).toEqual([{ priority: "urgent", source: "meeting", type: "reminder" }]);

    // Cancelling asks first.
    await page.reload();
    await page
      .getByRole("button", { name: "Annuler le rappel : Appeler le client pour le devis" })
      .click();
    await page
      .getByRole("dialog", { name: "Annuler le rappel" })
      .getByRole("button", { name: "Annuler le rappel" })
      .click();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("ai_conductor_reminders")
              .select("status")
              .eq("incident_id", caseId)
              .single()
          ).data?.status,
      )
      .toBe("cancelled");
  });
});

test.describe("E — installable app", () => {
  test("manifest, service worker and push opt-in", async ({ page, context }) => {
    const manifest = await page.request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const m = await manifest.json();
    expect(m).toMatchObject({ name: "Pratonna", start_url: "/app", display: "standalone" });
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    for (const icon of m.icons) expect((await page.request.get(icon.src)).status()).toBe(200);

    await login(page, "technician");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
    await expect
      .poll(() =>
        page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state),
      )
      .toBe("activated");

    await page.goto("/app/notifications");
    const toggle = page.getByTestId("push-toggle");
    await expect(toggle).toHaveAttribute("data-state", "off");
    await expect(
      toggle.getByRole("button", { name: "Activer les notifications push" }),
    ).toBeEnabled();
    void context;
  });
});

test.describe("F — approvals, isolation, audit", () => {
  test("staff confirm before marking paid or sending a reminder", async ({ page }) => {
    test.skip(!desktop(page), "writes shared rows");
    const { companyId, users } = readState();
    const t = tag();
    const admin = adminClient();
    await admin.from("ai_conductor_invoices").insert({
      id: `FAC-${t}`,
      reference: `FAC-E2E-${t}`,
      company_id: companyId,
      client_id: users.client.profileId,
      title: `Facture ${t}`,
      amount: 120,
      status: "unpaid",
      issued_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
    await login(page, "accountant");
    await page.goto("/app/invoices");
    const row = page.getByRole("row", { name: new RegExp(t) });
    for (const [button, dialogName] of [
      ["Confirmer le paiement", "Confirmer le paiement"],
      ["Envoyer un rappel", "Envoyer un rappel"],
    ] as const) {
      await row.getByRole("button", { name: button }).click();
      await page
        .getByRole("dialog", { name: dialogName })
        .getByRole("button", { name: "Annuler" })
        .click();
    }
    const { data } = await admin
      .from("ai_conductor_invoices")
      .select("status, reminders")
      .eq("id", `FAC-${t}`)
      .single();
    expect(data).toEqual({ status: "unpaid", reminders: [] });
  });

  test("another company's case, quote and conversation are invisible", async ({ page }) => {
    const admin = adminClient();
    // Any row of another company (e.g. the demo data); skip if the project has none.
    const { companyId } = readState();
    const { data: foreign } = await admin
      .from("ai_conductor_quotations")
      .select("id, incident_id")
      .neq("company_id", companyId)
      .not("incident_id", "is", null)
      .limit(1)
      .maybeSingle();
    test.skip(!foreign, "no other company in this project");
    await login(page, "manager");
    await page.goto(`/app/cases/${foreign!.incident_id}`);
    await expect(page.getByText("Page introuvable")).toBeVisible();
    expect((await page.request.get(`/api/quotes/${foreign!.id}/pdf`)).status()).toBe(404);

    const { data: conv } = await admin
      .from("ai_conductor_ai_conversations")
      .select("id")
      .neq("company_id", companyId)
      .limit(1)
      .maybeSingle();
    if (conv) {
      const res = await page.request.get(`/api/assistant?c=${conv.id}`);
      expect(await res.json()).toEqual({ items: [] });
    }
  });

  test("the assistant cannot send a message without approval", async ({ page }) => {
    test.skip(!desktop(page), "real AI call");
    test.setTimeout(240_000);
    const { caseId } = await quoteToSign();
    const admin = adminClient();
    const { data: ref } = await admin
      .from("ai_conductor_incidents")
      .select("reference")
      .eq("id", caseId)
      .single();
    const count = async () =>
      (
        await admin
          .from("ai_conductor_incident_messages")
          .select("id", { count: "exact", head: true })
          .eq("incident_id", caseId)
      ).count;
    expect(await count()).toBe(0);

    await loginAs(page, readState().users.client.email);
    await page.goto("/app/assistant");
    await page
      .getByLabel("Écrivez votre message…")
      .fill(`Envoie le message « Pouvez-vous passer jeudi ? » sur le dossier ${ref!.reference}.`);
    await page.getByRole("button", { name: "Envoyer" }).click();
    const proposal = page.getByTestId("ai-proposal").last();
    await expect(proposal).toContainText("En attente de votre validation", { timeout: 150_000 });
    expect(await count()).toBe(0);
    await proposal.getByRole("button", { name: "Refuser" }).click();
    await expect(proposal).toContainText("Refusée", { timeout: 60_000 });
    expect(await count()).toBe(0);
    const { data: rejected } = await admin
      .from("ai_conductor_audit_log")
      .select("action")
      .eq("actor_id", readState().users.client.profileId)
      .eq("action", "ai.action_rejected");
    expect(rejected?.length).toBeGreaterThanOrEqual(1);
  });
});
