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

// Real OpenAI calls against the real database: desktop only, serial.
test.describe.configure({ mode: "serial" });
test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1440, "desktop only (real AI calls)");

const AI_TIMEOUT = 120_000;
const marker = randomUUID().slice(0, 6).toUpperCase();
const reference = `INC-2026-9${String(parseInt(marker, 16) % 1000).padStart(3, "0")}`;
const title = `Fuite toiture assistant ${marker}`;
let caseId = "";

async function ask(page: Page, text: string) {
  const replies = page.getByRole("main").locator("time", { hasText: /·/ });
  const before = await replies.count();
  await page.getByLabel("Écrivez votre message…").fill(text);
  await page.getByRole("button", { name: "Envoyer" }).click();
  // A reply can hold several bubbles (text before and after a tool call).
  await expect.poll(() => replies.count(), { timeout: AI_TIMEOUT }).toBeGreaterThan(before);
  await expect(page.getByText(/réfléchit…/)).toBeHidden({ timeout: AI_TIMEOUT });
}

test.beforeAll(async () => {
  const { companyId, users } = readState();
  caseId = `INC-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { error } = await adminClient().from("ai_conductor_incidents").insert({
    id: caseId,
    reference,
    company_id: companyId,
    title,
    description: "Infiltration au plafond du 3e étage après la pluie.",
    status: "new",
    urgency: "low",
    channel: "app",
    client_id: users.client.profileId,
    complainant_name: users.client.name,
    city: "Lyon",
    building_address: "12 rue Garibaldi",
  });
  if (error) throw error;
});

test("manager: the assistant reads real cases and proposes a triage that runs only once approved", async ({
  page,
  shot,
}) => {
  await login(page, "manager");
  await page.goto("/app/assistant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Assistante IA");
  await expect(page.getByText("Bonjour, je suis Maya.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot("assistant-empty");

  await ask(page, "Quels nouveaux dossiers faut-il trier ? Donne leurs références.");
  await expect(page).toHaveURL(/\/app\/assistant\?c=/);
  await expect(page.getByRole("main").getByText(reference).first()).toBeVisible();

  await ask(page, `Mets l’urgence du dossier ${reference} en haute.`);
  const proposal = page.getByTestId("ai-proposal").last();
  await expect(proposal).toContainText(`Trier le dossier ${reference}`);
  await expect(proposal).toContainText("En attente de votre validation");

  // Proposed, not executed: the case has not moved.
  const admin = adminClient();
  const before = await admin
    .from("ai_conductor_incidents")
    .select("status, urgency")
    .eq("id", caseId)
    .single();
  expect(before.data).toEqual({ status: "new", urgency: "low" });
  await shot("assistant-proposal");

  await proposal.getByRole("button", { name: "Valider" }).click();
  await expect(proposal).toContainText("Exécutée", { timeout: 60_000 });
  const after = await admin
    .from("ai_conductor_incidents")
    .select("status, urgency")
    .eq("id", caseId)
    .single();
  expect(after.data).toEqual({ status: "awaiting_assignment", urgency: "high" });

  const { data: log } = await admin
    .from("ai_conductor_audit_log")
    .select("action")
    .eq("company_id", readState().companyId)
    .eq("action", "ai.action_executed")
    .eq("entity_type", "ai_action");
  expect(log?.length).toBe(1);
  await expect(page.getByRole("button", { name: "Valider" })).toHaveCount(0);
  await shot("assistant-executed");
});

test("another client's case stays invisible to the assistant", async ({ page }) => {
  await loginAs(page, readState().client2.email);
  await page.goto("/app/assistant");
  await ask(page, `Donne-moi le titre et la description du dossier ${reference}.`);
  await expect(page.getByRole("main")).not.toContainText(marker);
  await expect(page.getByRole("main")).not.toContainText("Infiltration au plafond");
});
