import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { adminClient, readState } from "./support/admin";
import {
  expect,
  expectNoHorizontalScroll,
  login,
  openAs,
  test,
  type Page,
} from "./support/fixtures";

// Phase 4 — voice agent. Chrome's fake microphone plays a real French
// question ("Bonjour. Combien de dossiers ai-je en cours ?") in a loop.
const QUESTION = join(__dirname, "fixtures", "question-fr.wav");
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${QUESTION}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});
test.describe.configure({ mode: "serial" });

const VOICE_TIMEOUT = 120_000;

async function openPanel(page: Page) {
  await page.getByTestId("assistant-button").click();
  const panel = page.getByRole("dialog", { name: "Maya" });
  await expect(panel).toBeVisible();
  return panel;
}

test("realtime: she hears the question, reads the cases and answers out loud", async ({
  page,
  shot,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) !== 1440, "real OpenAI Realtime call");
  test.setTimeout(240_000);
  await login(page, "technician");
  const panel = await openPanel(page);
  await panel.getByTestId("assistant-mic").click();

  const status = panel.getByTestId("voice-status");
  await expect(status).toHaveAttribute("data-mode", "realtime", { timeout: 90_000 });
  await expect(status).toHaveAttribute("data-state", /listening|thinking|speaking/, {
    timeout: 30_000,
  });
  await expect(panel.getByTestId("assistant-mic")).toHaveAttribute("aria-pressed", "true");
  await shot("voice-realtime-listening");

  // The spoken question is transcribed and stored, a read tool runs on our
  // server, and her spoken answer is stored as text.
  await expect(
    panel
      .locator("li")
      .filter({ hasText: /dossiers? .*en cours/i })
      .first(),
  ).toBeVisible({
    timeout: VOICE_TIMEOUT,
  });
  await expect(panel.getByText(/Consultation : dossiers/).first()).toBeVisible({
    timeout: VOICE_TIMEOUT,
  });
  await expect(panel.locator("time", { hasText: /Maya ·/ }).first()).toBeVisible({
    timeout: VOICE_TIMEOUT,
  });
  await shot("voice-realtime-answer");

  await panel.getByRole("button", { name: "Arrêter la voix" }).first().click();
  await expect(status).toBeHidden();

  const { data: conv } = await adminClient()
    .from("ai_conductor_ai_conversations")
    .select("id, channel")
    .eq("user_id", readState().users.technician.profileId)
    .eq("channel", "voice")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const { data: rows } = await adminClient()
    .from("ai_conductor_ai_messages")
    .select("role")
    .eq("conversation_id", conv!.id);
  const roles = new Set((rows ?? []).map((r) => r.role));
  for (const role of ["user", "assistant", "tool"]) expect(roles).toContain(role);
});

test("fallback: without WebRTC it records, transcribes, answers and reads it aloud", async ({
  page,
  shot,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) === 768, "covered at 390 and 1440");
  test.setTimeout(240_000);
  // A browser without WebRTC.
  await page.addInitScript(() => {
    // @ts-expect-error — removing the API on purpose
    delete window.RTCPeerConnection;
  });
  await login(page, "client");
  const panel = await openPanel(page);
  await panel.getByTestId("assistant-mic").click();
  const status = panel.getByTestId("voice-status");
  await expect(status).toHaveAttribute("data-mode", "fallback", { timeout: 90_000 });
  await expect(status).toHaveAttribute("data-state", "recording");
  await expectNoHorizontalScroll(page);
  await shot("voice-fallback-recording");

  // Let the question play into the recorder, then send it.
  await page.waitForTimeout(6_000);
  const speech = page.waitForResponse((r) => r.url().endsWith("/api/voice/speak"), {
    timeout: VOICE_TIMEOUT,
  });
  await status.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    panel
      .locator("li")
      .filter({ hasText: /dossiers? .*en cours/i })
      .first(),
  ).toBeVisible({
    timeout: VOICE_TIMEOUT,
  });
  await expect(panel.locator("time", { hasText: /Maya ·/ }).first()).toBeVisible({
    timeout: VOICE_TIMEOUT,
  });
  const spoken = await speech;
  expect(spoken.status()).toBe(200);
  expect(spoken.headers()["content-type"]).toBe("audio/mpeg");
  // Back to recording for the next question.
  await expect(status).toHaveAttribute("data-state", "recording", { timeout: 60_000 });
  await shot("voice-fallback-answer");
  await panel.getByRole("button", { name: "Arrêter la voix" }).first().click();
});

test.describe("voice API", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1440, "API checks");

  test("the browser gets a short-lived secret, never the API key", async ({ page }) => {
    await login(page, "manager");
    const res = await page.request.post("/api/voice/session", { data: { conversationId: null } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("realtime");
    expect(body.clientSecret).toMatch(/^ek_/);
    expect(JSON.stringify(body)).not.toContain(process.env.OPENAI_API_KEY ?? "sk-");
    expect(body.expiresAt * 1000 - Date.now()).toBeLessThanOrEqual(65_000);
  });

  test("a spoken write is only a proposal until approved", async ({ page, browser }, testInfo) => {
    const { companyId, users } = readState();
    const t = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const caseId = `INC-${t}`;
    const admin = adminClient();
    await admin.from("ai_conductor_incidents").insert({
      id: caseId,
      reference: `INC-2026-6${String(parseInt(t.slice(0, 6), 16) % 1000).padStart(3, "0")}`,
      company_id: companyId,
      title: `Voix ${t}`,
      status: "new",
      urgency: "low",
      channel: "app",
      client_id: users.client.profileId,
    });
    await login(page, "manager");
    const session = await (
      await page.request.post("/api/voice/session", { data: { conversationId: null } })
    ).json();

    // What the browser reports when the realtime model calls a write tool.
    const res = await page.request.post("/api/voice/turn", {
      data: {
        conversationId: session.conversationId,
        kind: "tool",
        callId: `call_${t}`,
        name: "triage_case",
        arguments: JSON.stringify({ case: caseId, urgency: "high" }),
      },
    });
    const output = JSON.parse((await res.json()).output);
    expect(output.status).toBe("pending_user_approval");
    const { data: unchanged } = await admin
      .from("ai_conductor_incidents")
      .select("status, urgency")
      .eq("id", caseId)
      .single();
    expect(unchanged).toEqual({ status: "new", urgency: "low" });

    // A tool outside the role is refused; someone else's conversation is not found.
    const refused = await page.request.post("/api/voice/turn", {
      data: {
        conversationId: session.conversationId,
        kind: "tool",
        callId: `call_x${t}`,
        name: "decline_quote",
        arguments: JSON.stringify({ case: caseId }),
      },
    });
    expect(JSON.parse((await refused.json()).output)).toEqual({
      error: "Tool not available for this user",
    });
    const errors: string[] = [];
    const other = await openAs(browser, testInfo, users.technician.email, errors);
    const foreign = await other.request.post("/api/voice/turn", {
      data: { conversationId: session.conversationId, kind: "user", text: "intrusion" },
    });
    expect(foreign.status()).toBe(404);
  });
});
