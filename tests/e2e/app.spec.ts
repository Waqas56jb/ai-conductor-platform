import { ROLES } from "../../src/lib/auth/roles";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  isNarrow,
  login,
  test,
  type Page,
} from "./support/fixtures";

/** Opens the sidebar drawer first on narrow screens. */
async function sidebarLinks(page: Page) {
  if (isNarrow(page)) await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav).toBeVisible();
  const links = await nav.getByRole("link").allInnerTexts();
  if (isNarrow(page)) await page.getByRole("button", { name: "Fermer le menu" }).click();
  return links.map((l) => l.trim());
}

test.describe("role-based shell", () => {
  for (const role of ROLES) {
    test(`${role}: dashboard and menu`, async ({ page, shot }) => {
      await login(page, role);
      const { users } = readState();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `Bonjour ${users[role].name.split(" ")[0]}`,
      );
      await expect(page.getByText("Membres de l’équipe")).toBeVisible();
      await expect(page.getByText("Aucune activité pour le moment.")).toBeVisible();
      await expectNoHorizontalScroll(page);

      const links = await sidebarLinks(page);
      const companyAllowed = role === "director" || role === "admin";
      expect(links).toEqual(
        companyAllowed
          ? ["Tableau de bord", "Entreprise", "Mon profil"]
          : ["Tableau de bord", "Mon profil"],
      );
      if (role === "director" || role === "client") await shot(`dashboard-${role}`);

      // Server-side RBAC: the URL itself is guarded, not just the menu.
      await page.goto("/app/company");
      if (companyAllowed)
        await expect(page.getByRole("heading", { name: "Entreprise", level: 1 })).toBeVisible();
      else await expect(page.getByText("Page introuvable")).toBeVisible();
    });
  }

  test("user menu shows the role and signs out after confirmation", async ({ page, shot }) => {
    await login(page, "manager");
    await page.getByRole("button", { name: "Menu utilisateur" }).click();
    const menu = page.getByRole("menu", { name: "Menu utilisateur" });
    await expect(menu).toContainText("Léa Gestionnaire");
    await expect(menu).toContainText("E2E Pratonna");
    await shot("user-menu");
    await menu.getByRole("menuitem", { name: "Se déconnecter" }).click();
    const dialog = page.getByRole("dialog", { name: "Se déconnecter ?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login\?signedout=1$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Vous êtes déconnecté." }),
    ).toBeVisible();
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("navigation", () => {
  test("search palette opens with Ctrl+K and navigates", async ({ page, shot }) => {
    await login(page, "director");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Rechercher une page" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("searchbox").fill("entrep");
    await expect(dialog.getByRole("option")).toHaveText(["Entreprise"]);
    await shot("search");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/company$/);

    // The trigger button works too, and an unknown term shows the empty state.
    await page
      .getByRole("button", { name: /Rechercher/ })
      .first()
      .click();
    await dialog.getByRole("searchbox").fill("zzz");
    await expect(dialog.getByText("Aucun résultat.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("sidebar: drawer on small screens, collapsible on desktop", async ({ page, shot }) => {
    await login(page, "admin");
    if (isNarrow(page)) {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      const nav = page.getByRole("navigation", { name: "Navigation principale" });
      await expect(nav).toBeInViewport();
      await shot("drawer-open");
      await page.keyboard.press("Escape");
      await expect(nav).not.toBeInViewport();
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      await nav.getByRole("link", { name: "Mon profil" }).click();
      await expect(page).toHaveURL(/\/app\/profile$/);
      await expect(nav).not.toBeInViewport();
    } else {
      // The drawer's close button only exists on small screens.
      await expect(page.getByRole("button", { name: "Fermer le menu" })).toBeHidden();
      await page.getByRole("button", { name: "Réduire le menu" }).click();
      await expect(page.getByRole("button", { name: "Déplier le menu" })).toBeVisible();
      await shot("sidebar-collapsed");
      await page.reload();
      await expect(page.getByRole("button", { name: "Déplier le menu" })).toBeVisible();
      await page.getByRole("button", { name: "Déplier le menu" }).click();
      await expect(page.getByRole("button", { name: "Réduire le menu" })).toBeVisible();
    }
  });

  test("language switch updates the interface and persists", async ({ page }) => {
    await login(page, "technician");
    if (isNarrow(page)) await page.getByRole("button", { name: "Menu utilisateur" }).click();
    await page
      .getByRole("group", { name: "Langue" })
      .first()
      .getByRole("button", { name: "EN" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello Théo");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.reload();
    await expect(page.getByText("Team members")).toBeVisible();
    if (isNarrow(page)) await page.getByRole("button", { name: "User menu" }).click();
    await page
      .getByRole("group", { name: "Language" })
      .first()
      .getByRole("button", { name: "FR" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Théo");
  });
});

test.describe("notifications", () => {
  test("unread badge, list and mark all as read", async ({ page, shot }) => {
    const { companyId, users } = readState();
    const admin = adminClient();
    await admin.from("ai_conductor_notifications").delete().eq("user_id", users.director.profileId);
    await admin.from("ai_conductor_notifications").insert([
      {
        company_id: companyId,
        user_id: users.director.profileId,
        title: "Nouveau dossier",
        body: "Fuite au 3B",
      },
      {
        company_id: companyId,
        user_id: users.director.profileId,
        title: "Devis à valider",
        body: "Toiture",
      },
      // Another user's notification must never show up.
      { company_id: companyId, user_id: users.client.profileId, title: "Pas pour le dirigeant" },
    ]);

    await login(page, "director");
    await expect(page.getByTestId("unread-count")).toHaveText("2");
    await page.getByRole("button", { name: /^Notifications/ }).click();
    const panel = page.getByRole("region", { name: "Notifications" });
    await expect(panel).toContainText("Nouveau dossier");
    await expect(panel).toContainText("Devis à valider");
    await expect(panel).not.toContainText("Pas pour le dirigeant");
    await shot("notifications");
    await panel.getByRole("button", { name: "Tout marquer comme lu" }).click();
    await expect(page.getByTestId("unread-count")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("unread-count")).toHaveCount(0);
  });
});

test.describe("profile", () => {
  test("edit details, validation and password change", async ({ page, shot }) => {
    await login(page, "accountant");
    await page.goto("/app/profile");
    await expect(page.getByLabel("E-mail (identifiant)")).toHaveValue(
      readState().users.accountant.email,
    );
    await expect(page.getByLabel("Rôle")).toHaveValue("Comptable");
    await expectNoHorizontalScroll(page);
    await shot("profile");

    await page.getByLabel("Téléphone").fill("abc");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Numéro de téléphone invalide.")).toBeVisible();

    await page.getByLabel("Nom affiché").fill("Clara Compta");
    await page.getByLabel("Téléphone").fill("+33 6 11 22 33 44");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Modifications enregistrées." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nom affiché")).toHaveValue("Clara Compta");
    await page.getByLabel("Nom affiché").fill("Clara Comptable");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Modifications enregistrées." }).first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Sécurité" }).click();
    await page.getByLabel("Nouveau mot de passe").fill("short");
    await page.getByLabel("Confirmer le mot de passe").fill("short");
    await page.getByRole("button", { name: "Changer le mot de passe" }).click();
    await expect(page.getByText("8 caractères minimum.")).toBeVisible();
    await shot("profile-security");
  });
});

test.describe("company", () => {
  test("director edits legal details; SIRET is validated", async ({ page, shot }) => {
    await login(page, "director");
    await page.goto("/app/company");
    await expect(page.getByRole("table", { name: "Équipe" })).toContainText(
      "Antoine Dirigeant (vous)",
    );
    await expect(page.getByText("7 membres")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByLabel(/^SIRET/).fill("1234");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Le SIRET comporte 14 chiffres.")).toBeVisible();

    await page.getByLabel(/^SIRET/).fill("123 456 789 00012");
    await page.getByLabel("Forme juridique").selectOption("SAS");
    await page.getByLabel("Ville").fill("Lyon");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Modifications enregistrées." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/^SIRET/)).toHaveValue("12345678900012");
    await expect(page.getByLabel("Forme juridique")).toHaveValue("SAS");
    await shot("company");
  });
});
