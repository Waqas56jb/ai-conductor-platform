import { randomUUID } from "node:crypto";
import type { Role } from "../../src/lib/auth/roles";
import { adminClient, readState } from "./support/admin";
import { expect, expectNoHorizontalScroll, login, test, type Page } from "./support/fixtures";

// Feedback round 1 — B (assistant entry point) and C (personalisation).

const ROLES: Role[] = ["client", "technician", "manager", "director", "accountant", "admin"];
const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 1440) < 640;

const button = (page: Page) => page.getByTestId("assistant-button");
const panel = (page: Page) => page.getByRole("dialog", { name: /Maya|Léa|Nova/ });

test.describe("assistant entry point", () => {
  for (const role of ROLES) {
    test(`${role}: the header button opens the assistant on every page`, async ({ page }) => {
      await login(page, role);
      for (const path of ["/app", "/app/cases", "/app/profile", "/app/settings/assistant"]) {
        if (path !== "/app") await page.goto(path);
        await expect(button(page)).toBeVisible();
        await expect(button(page)).toHaveAccessibleName("Ouvrir l’assistante Maya");
        // Label on wide screens, avatar alone on phones.
        await expect(button(page).getByText("Assistante", { exact: true })).toBeVisible({
          visible: !isNarrow(page),
        });
      }
      await button(page).click();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page).getByRole("heading", { name: "Maya" })).toBeVisible();
      await expect(panel(page).getByLabel("Écrivez votre message…")).toBeFocused();
      // Voice is not there yet: the mic says so instead of pretending.
      const mic = panel(page).getByTestId("assistant-mic");
      await expect(mic).toBeDisabled();
      await expect(mic).toHaveAccessibleDescription("Bientôt : la voix arrive prochainement");
      await expectNoHorizontalScroll(page);
      await page.keyboard.press("Escape");
      await expect(panel(page)).toBeHidden();
      await expect(button(page)).toBeFocused();
    });
  }

  test("manager: today's priorities come from the data and hand off to the assistant", async ({
    page,
    shot,
  }) => {
    const { companyId, users } = readState();
    const admin = adminClient();
    const now = new Date();
    // One of each priority: an overdue invoice, a quote waiting for the
    // manager, and a client message nobody answered yet.
    const tag = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const caseId = `INC-${tag}`;
    const { error: caseError } = await admin.from("ai_conductor_incidents").insert({
      id: caseId,
      reference: `INC-2026-8${String(parseInt(tag.slice(0, 6), 16) % 1000).padStart(3, "0")}`,
      company_id: companyId,
      title: `Priorités ${tag}`,
      status: "devis_pending_manager",
      client_id: users.client.profileId,
      channel: "app",
    });
    expect(caseError).toBeNull();
    const { error: invoiceError } = await admin.from("ai_conductor_invoices").insert({
      id: `FAC-${tag}`,
      reference: `FAC-E2E-${tag}`,
      company_id: companyId,
      incident_id: caseId,
      client_id: users.client.profileId,
      title: `Facture ${tag}`,
      amount: 480,
      status: "unpaid",
      issued_at: new Date(now.getTime() - 40 * 86_400_000).toISOString(),
      due_at: new Date(now.getTime() - 10 * 86_400_000).toISOString(),
    });
    expect(invoiceError).toBeNull();
    const { error: messageError } = await admin.from("ai_conductor_incident_messages").insert({
      company_id: companyId,
      incident_id: caseId,
      from_id: users.client.profileId,
      from_name: users.client.name,
      from_role: "client",
      text: "Pouvez-vous me rappeler ?",
    });
    expect(messageError).toBeNull();

    // What the manager can see: the whole company.
    const [{ data: invoices }, { data: cases }, { data: proposals }, { data: messages }] =
      await Promise.all([
        admin.from("ai_conductor_invoices").select("status, due_at").eq("company_id", companyId),
        admin.from("ai_conductor_incidents").select("status").eq("company_id", companyId),
        admin
          .from("ai_conductor_ai_actions")
          .select("id")
          .eq("user_id", users.manager.profileId)
          .eq("status", "pending")
          .gt("expires_at", now.toISOString()),
        admin
          .from("ai_conductor_incident_messages")
          .select("incident_id, from_id")
          .eq("company_id", companyId)
          .gte("created_at", new Date(now.getTime() - 14 * 86_400_000).toISOString())
          .order("created_at", { ascending: false }),
      ]);
    const overdue = (invoices ?? []).filter(
      (i) => !["paid", "cancelled"].includes(i.status) && i.due_at && new Date(i.due_at) < now,
    ).length;
    const approvals =
      (cases ?? []).filter((c) => c.status === "devis_pending_manager").length +
      (proposals?.length ?? 0);
    const latest = new Map<string, string | null>();
    for (const m of messages ?? []) if (!latest.has(m.incident_id)) latest.set(m.incident_id, m.from_id);
    const unanswered = [...latest.values()].filter((f) => f !== users.manager.profileId).length;
    expect(Math.min(overdue, approvals, unanswered)).toBeGreaterThan(0);

    await login(page, "manager");
    for (const [key, count] of [
      ["overdue", overdue],
      ["approvals", approvals],
      ["messages", unanswered],
    ] as const) {
      await expect(page.getByTestId(`priority-${key}`).locator("strong")).toHaveText(String(count));
    }
    await shot("welcome-card");

    await page
      .getByTestId("priority-overdue")
      .getByRole("button", { name: /Elle s’en occupe/ })
      .click();
    await expect(panel(page).getByLabel("Écrivez votre message…")).toHaveValue(
      "Quelles factures sont en retard ? Prépare les relances à valider.",
    );
    await shot("assistant-panel-prefilled");
    await panel(page).getByRole("button", { name: "Fermer l’assistante" }).click();
    await page.getByRole("button", { name: "Demander à l’assistante" }).click();
    await expect(panel(page).getByText("Bonjour, je suis Maya.")).toBeVisible();
  });
});

test.describe("assistant personalisation", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1440, "desktop only (shared profile row)");

  const reset = async () => {
    const { users } = readState();
    const admin = adminClient();
    await admin.from("ai_conductor_assistant_profiles").delete().eq("user_id", users.technician.profileId);
    await admin.from("ai_conductor_assistant_memories").delete().eq("user_id", users.technician.profileId);
  };
  test.beforeAll(reset);
  test.afterAll(reset);

  test("name, avatar, tone and colour apply at once and persist", async ({ page, shot }) => {
    await login(page, "technician");
    await page.goto("/app/settings/assistant");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réglages de l’assistante");

    const name = page.getByLabel("Nom de l’assistante");
    await name.fill("Léa");
    // Live: the header follows while typing, before anything is saved.
    await expect(button(page)).toHaveAccessibleName("Ouvrir l’assistante Léa");
    await name.press("Enter");
    await expect(page.getByText("Enregistré.").first()).toBeVisible();

    await page.getByText("Abstrait", { exact: true }).click();
    await expect(button(page).locator("img")).toHaveCount(0);

    await page.getByText("Direct", { exact: true }).click();
    await page.getByText("Ton adapté au contexte", { exact: true }).click();
    await expect(page.getByRole("switch", { name: /Ton adapté au contexte/ })).not.toBeChecked();
    await page.getByLabel("Voix").selectOption("off");

    const accent = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--blue").trim(),
      );
    expect(await accent()).toBe("#2f6bff");
    await page.getByText("Émeraude", { exact: true }).click();
    await expect.poll(accent).toBe("#047857");
    await expect(page.getByText("Enregistré.").first()).toBeVisible();
    await shot("assistant-settings");

    await expect
      .poll(async () => {
        const { data } = await adminClient()
          .from("ai_conductor_assistant_profiles")
          .select("display_name, avatar_type, tone, context_aware_tone, voice, theme_color")
          .eq("user_id", readState().users.technician.profileId)
          .maybeSingle();
        return data;
      })
      .toEqual({
        display_name: "Léa",
        avatar_type: "abstract",
        tone: "direct",
        context_aware_tone: false,
        voice: "off",
        theme_color: "emerald",
      });

    // Persisted: a fresh load already has them, and the panel uses the new name.
    await page.goto("/app");
    expect(await accent()).toBe("#047857");
    await button(page).click();
    await expect(panel(page).getByRole("heading", { name: "Léa" })).toBeVisible();
    await expect(panel(page).getByText("Bonjour, je suis Léa.")).toBeVisible();

    // Only this user changed: everyone else keeps the defaults.
    const { data: rows } = await adminClient()
      .from("ai_conductor_assistant_profiles")
      .select("user_id")
      .eq("company_id", readState().companyId);
    expect((rows ?? []).map((r) => r.user_id)).toEqual([readState().users.technician.profileId]);
  });

  test("memories: add, approve a suggestion, delete, clear all", async ({ page, shot }) => {
    const { users, companyId } = readState();
    // A suggestion the assistant made (suggest_memory tool): not used until approved.
    await adminClient().from("ai_conductor_assistant_memories").insert({
      user_id: users.technician.profileId,
      company_id: companyId,
      kind: "preference",
      content: "Préfère les comptes rendus en liste.",
      approved: false,
      source: "assistant",
    });

    await login(page, "technician");
    await page.goto("/app/settings/assistant");
    const items = page.getByTestId("memory");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Suggestion à valider");

    await page.getByLabel("Nouvel élément").fill("Toujours vouvoyer les clients.");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(items).toHaveCount(2);

    await items
      .filter({ hasText: "comptes rendus" })
      .getByRole("button", { name: "Valider" })
      .click();
    await expect(page.getByText("Suggestion à valider")).toHaveCount(0);
    await shot("assistant-memories");

    await page.getByRole("button", { name: "Supprimer : Toujours vouvoyer les clients." }).click();
    await expect(items).toHaveCount(1);

    await page.getByRole("button", { name: "Tout effacer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Tout effacer" }).click();
    await expect(page.getByText("Aucune mémoire pour l’instant.")).toBeVisible();
    const { count } = await adminClient()
      .from("ai_conductor_assistant_memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", users.technician.profileId);
    expect(count).toBe(0);

    // Every change is in the audit log.
    const { data: log } = await adminClient()
      .from("ai_conductor_audit_log")
      .select("action")
      .eq("actor_id", users.technician.profileId)
      .like("action", "assistant.%");
    const actions = new Set((log ?? []).map((l) => l.action));
    for (const a of [
      "assistant.settings_updated",
      "assistant.memory_added",
      "assistant.memory_approved",
      "assistant.memory_deleted",
      "assistant.memories_cleared",
    ])
      expect(actions).toContain(a);
  });

  test("the panel streams a real reply", async ({ page, shot }) => {
    test.setTimeout(180_000);
    await login(page, "technician");
    await button(page).click();
    const p = panel(page);
    await p.getByLabel("Écrivez votre message…").fill("Combien de dossiers ai-je en cours ? Réponds en une phrase.");
    await p.getByRole("button", { name: "Envoyer" }).click();
    // The answer arrives in the panel, then is stored with its time.
    await expect(p.locator("time", { hasText: /·/ })).toHaveCount(1, { timeout: 120_000 });
    await expect(p.getByText(/réfléchit…/)).toBeHidden();
    await shot("assistant-panel-reply");
  });
});
