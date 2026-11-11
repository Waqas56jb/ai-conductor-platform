// Step 1 of the 1-minute demo video: real product screens, created through the
// app's own UI in the demo company "Pratonna Démo" (service order, AG minutes,
// a partial payment) and captured at 1440×900 (×1.5). Idempotent. From the repo root:
//   node --env-file=.env scripts/video/capture-screens.mjs <workDir>/video
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://pratonna-app.vercel.app";
const PASSWORD = "Demo-Pratonna-2026";
const out = process.argv[2];
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function session(browser, who) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "fr-FR" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(`${who}@pratonna-demo.test`);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/app");
  await page.waitForLoadState("networkidle");
  return page;
}
const settle = async (page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
};
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });

(async () => {
  const { data: company } = await db.from("ai_conductor_companies").select("id").eq("name", "Pratonna Démo").single();
  const { data: leak } = await db
    .from("ai_conductor_incidents")
    .select("id, reference")
    .eq("company_id", company.id)
    .eq("reference", "INC-2026-0001")
    .single();
  const browser = await chromium.launch({ channel: "chrome" });

  // Intro: the manager's dashboard.
  const manager = await session(browser, "manager");
  await settle(manager);
  await shot(manager, "01-dashboard");

  // 1a. A leak is reported: urgency and the contracted provider to send.
  await manager.goto(`${BASE}/app/cases/${leak.id}`);
  await settle(manager);
  await shot(manager, "02-leak");

  // 1b. Service order drafted by the manager, submitted to the funds check.
  const { data: existing } = await db
    .from("ai_conductor_service_orders")
    .select("id")
    .eq("company_id", company.id)
    .ilike("title", "Remplacement de la colonne d’eau%")
    .maybeSingle();
  let orderId = existing?.id;
  if (!orderId) {
    await manager.goto(`${BASE}/app/service-orders`);
    await settle(manager);
    await manager.getByRole("button", { name: "Nouvel ordre de service" }).click();
    const form = manager.getByRole("dialog", { name: "Nouvel ordre de service" });
    await form.getByLabel("Intitulé des travaux").fill("Remplacement de la colonne d’eau — Résidence Vendôme");
    await form.getByLabel("Prestataire", { exact: true }).fill("Plomberie Martin");
    await form.getByLabel("E-mail du prestataire").fill("contact@plomberie-martin.example");
    await form.getByLabel("Dossier lié").selectOption({ label: /Fuite d’eau/ }).catch(() => {});
    await form.getByLabel("Montant HT (€)").fill("3800");
    await form.getByLabel("TVA").selectOption("10");
    await form.getByLabel("Description des travaux").fill("Remplacement de la colonne d’eau froide du bâtiment B, du sous-sol au 5e étage, suite à la fuite signalée.");
    await form.getByRole("button", { name: "Créer le brouillon" }).click();
    await manager.waitForURL(/\/app\/service-orders\/OS-/);
    await settle(manager);
    orderId = manager.url().split("/").pop();
    await manager.getByRole("button", { name: "Soumettre" }).click();
    await manager.getByRole("dialog", { name: "Soumettre" }).getByRole("button", { name: "Confirmer" }).click();
    await settle(manager);
  }
  const director = await session(browser, "director");
  await director.goto(`${BASE}/app/service-orders/${orderId}`);
  await settle(director);
  await shot(director, "03-service-order");

  // 1c. General assembly minutes drafted from the manager's notes.
  const { data: meeting } = await db
    .from("ai_conductor_meetings")
    .select("id")
    .eq("company_id", company.id)
    .ilike("title", "Assemblée générale%")
    .maybeSingle();
  let meetingId = meeting?.id;
  if (!meetingId) {
    await manager.goto(`${BASE}/app/meetings`);
    await settle(manager);
    await manager.getByLabel("Réunion").fill("Assemblée générale — Résidence Vendôme");
    await manager.getByLabel("Participants").fill("Conseil syndical, Léa Bernard (syndic), 14 copropriétaires");
    await manager
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill(
        "AG annuelle de la résidence Vendôme. 14 copropriétaires présents ou représentés sur 20. Comptes de l’exercice approuvés à l’unanimité. Travaux votés : remplacement de la colonne d’eau du bâtiment B, budget 4 180 € TTC, entreprise Plomberie Martin, à la majorité de l’article 24. Ravalement de façade reporté à l’an prochain, demander deux devis supplémentaires. Le syndic envoie le procès-verbal sous 15 jours et lance l’ordre de service des travaux. Le conseil syndical se réunit en janvier pour suivre le chantier.",
      );
    await manager.getByRole("button", { name: "Rédiger le compte rendu" }).click();
    await manager.waitForURL(/\/app\/meetings\/[0-9a-f-]{36}$/, { timeout: 120_000 });
    meetingId = manager.url().split("/").pop();
  }
  await manager.goto(`${BASE}/app/meetings/${meetingId}`);
  await settle(manager);
  await shot(manager, "04-meeting");

  // 2a. Unpaid invoice past its due date: the reminder, before it is sent.
  const { data: invoice } = await db
    .from("ai_conductor_invoices")
    .select("id, amount, status")
    .eq("company_id", company.id)
    .eq("reference", "FAC-2026-0001")
    .single();
  const { count: paidCount } = await db
    .from("ai_conductor_payments")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoice.id);
  if (invoice.status === "unpaid") {
    // What the daily overdue job does once the due date has passed.
    const due = new Date(Date.now() - 12 * 86_400_000).toISOString();
    await db.from("ai_conductor_invoices").update({ due_at: due, status: "overdue" }).eq("id", invoice.id);
  }
  const accountant = await session(browser, "accountant");
  if (!paidCount) {
    // An owner pays part of it: recorded by the accountant.
    await accountant.goto(`${BASE}/app/invoices`);
    await settle(accountant);
    const row = accountant.locator("tr, article").filter({ hasText: "FAC-2026-0001" }).first();
    await row.getByRole("button", { name: "Confirmer le paiement" }).click();
    const dialog = accountant.getByRole("dialog");
    await dialog.getByLabel("Montant reçu (€)").fill("150");
    await dialog.getByLabel("Mode de paiement").selectOption("transfer");
    await dialog.getByLabel(/Référence/).fill("VIR PROPRIETAIRE DURAND");
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await settle(accountant);
  }
  await manager.goto(`${BASE}/app/invoices`);
  await settle(manager);
  await shot(manager, "05-invoices");
  const row = manager.locator("tr, article").filter({ hasText: "FAC-2026-0001" }).first();
  await row.getByRole("button", { name: "Envoyer un rappel" }).click();
  await manager.waitForTimeout(800);
  await shot(manager, "06-reminder");
  await manager.keyboard.press("Escape");

  // 2b. Payments received.
  await accountant.goto(`${BASE}/app/payments`);
  await settle(accountant);
  await shot(accountant, "07-payments");

  await browser.close();
  console.log("captured");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
