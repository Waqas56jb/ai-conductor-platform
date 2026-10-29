import { adminClient, E2E_PASSWORD, e2eEmail, findAuthUserId, readState } from "./support/admin";
import { expect, expectNoHorizontalScroll, test } from "./support/fixtures";

test.describe("auth pages", () => {
  for (const [path, name, heading] of [
    ["/login", "login", "Bon retour parmi nous"],
    ["/signup", "signup", "Créez votre espace"],
    ["/forgot-password", "forgot-password", "Mot de passe oublié"],
    ["/check-email?email=jeanne%40exemple.fr", "check-email", "Vérifiez votre boîte mail"],
    ["/reset-password", "reset-password-expired", "Nouveau mot de passe"],
  ] as const) {
    test(`${path} renders`, async ({ page, shot }) => {
      await page.goto(path);
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expectNoHorizontalScroll(page);
      await shot(name);
    });
  }

  test("/app requires a session", async ({ page }) => {
    await page.goto("/app/profile");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fprofile$/);
  });

  test("login validates and rejects bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Adresse e-mail invalide.")).toBeVisible();

    // Fresh form: React's post-submit form reset could otherwise land after the
    // fields below are typed and clear them.
    await page.reload();
    await page.getByLabel("E-mail").fill(readState().users.client.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("wrong-password-1");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "E-mail ou mot de passe incorrect.",
    );
  });

  test("a Supabase account without a Pratonna profile is refused", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(readState().orphan.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Ce compte n’est rattaché à aucune entreprise Pratonna.",
    );
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup validates every field", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("E-mail professionnel").fill("pas-un-email");
    await page.getByLabel("Mot de passe", { exact: true }).fill("abcdefgh");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Champ obligatoire.")).toHaveCount(2);
    await expect(page.getByText("Adresse e-mail invalide.")).toBeVisible();
    await expect(page.getByText("Au moins une lettre et un chiffre.")).toBeVisible();
    // Values typed so far survive the round trip.
    await expect(page.getByLabel("E-mail professionnel")).toHaveValue("pas-un-email");
  });

  test("forgot password never reveals whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("E-mail").fill(e2eEmail("does-not-exist"));
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    // "sent" — or, if Supabase's mailer is rate-limited, an honest error.
    const sent = page.getByRole("status").filter({ hasText: "Si un compte existe" });
    const failed = page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "n’a pas pu être envoyé" });
    await expect(sent.or(failed)).toBeVisible();
  });

  test("recovery link → new password → sign in with it", async ({ page, shot }, testInfo) => {
    const { recovery } = readState();
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: recovery.email,
    });
    expect(error).toBeNull();

    await page.goto(
      `/auth/confirm?type=recovery&token_hash=${data.properties!.hashed_token}&next=/reset-password`,
    );
    await expect(page).toHaveURL(/\/reset-password$/);
    const newPassword = `Nouveau-${testInfo.project.name}-2026`;
    await page.getByLabel("Nouveau mot de passe").fill(newPassword);
    await page.getByLabel("Confirmer le mot de passe").fill(`${newPassword}x`);
    await page.getByRole("button", { name: "Mettre à jour" }).click();
    await expect(page.getByText("Les mots de passe ne correspondent pas.")).toBeVisible();
    // React resets the form after each submit: both password fields are empty again.
    await page.getByLabel("Nouveau mot de passe").fill(newPassword);
    await page.getByLabel("Confirmer le mot de passe").fill(newPassword);
    await page.getByRole("button", { name: "Mettre à jour" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Mot de passe mis à jour." }),
    ).toBeVisible();
    await shot("reset-password-done");

    // Fresh browser state, then sign in with the new password.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(recovery.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/app");
  });

  test("an invalid email link is reported", async ({ page }) => {
    await page.goto("/auth/confirm?type=recovery&token_hash=invalid");
    await expect(page).toHaveURL(/\/login\?error=link$/);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Ce lien est invalide ou a expiré.",
    );
  });
});

test.describe("signup end to end", () => {
  // One real sign-up is enough; it sends a confirmation email through Supabase.
  test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1440, "desktop only");

  test("creates the company, then confirms and signs in", async ({ page, shot }) => {
    // Supabase rejects reserved domains (.test) at sign-up; example.com is
    // accepted and has no mail server, so nothing is ever delivered.
    const email = `e2e-signup-${Date.now()}@example.com`;
    const admin = adminClient();

    await page.goto("/signup");
    await page.getByLabel("Nom complet").fill("Nina Nouvelle");
    await page.getByLabel("Nom de l’entreprise").fill("E2E Signup SARL");
    await page.getByLabel("E-mail professionnel").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // The confirmation email goes through the shared project's mailer, which may
    // be rate-limited. Either way the app must behave correctly.
    const sent = page.getByText(email);
    const failed = page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "n’a pas pu être envoyé" });
    await expect(sent.or(failed)).toBeVisible({ timeout: 30_000 });
    if (await failed.isVisible()) {
      await shot("signup-email-failed");
      // Nothing half-created: no auth account, no profile, no company.
      expect(await findAuthUserId(email)).toBeNull();
      const { count } = await admin
        .from("ai_conductor_companies")
        .select("id", { count: "exact", head: true })
        .eq("name", "E2E Signup SARL");
      expect(count).toBe(0);
      test.info().annotations.push({
        type: "blocker",
        description: "Supabase did not send the confirmation email (send rate limit / SMTP).",
      });
      return;
    }
    await expect(page).toHaveURL(/\/check-email\?email=/);
    await shot("signup-check-email");

    // The account, its company, profile and settings exist; the user is unconfirmed.
    const { data: profile } = await admin
      .from("ai_conductor_users")
      .select("role, display_name, company_id, auth_user_id")
      .eq("email", email)
      .single();
    expect(profile).toMatchObject({ role: "director", display_name: "Nina Nouvelle" });
    const { data: settings } = await admin
      .from("ai_conductor_settings")
      .select("approval_threshold_eur")
      .eq("company_id", profile!.company_id)
      .single();
    expect(Number(settings!.approval_threshold_eur)).toBe(1000);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Confirmez d’abord votre adresse e-mail",
    );

    // Simulate clicking the confirmation email.
    await admin.auth.admin.updateUserById(profile!.auth_user_id as string, { email_confirm: true });
    await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/app");
    await expect(page.getByText("Votre espace E2E Signup SARL")).toBeVisible();

    const duplicate = await page.context().newPage();
    await duplicate.goto("/signup"); // signed in → redirected
    await expect(duplicate).toHaveURL(/\/app$/);
    await duplicate.close();
  });
});
