import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const env: Record<string, string | undefined> = {};
vi.mock("@/lib/env", () => ({ env }));

const { encrypt, decrypt } = await import("@/lib/crypto");
const { MAIL_PROVIDERS, redirectUri } = await import("./providers");

beforeEach(() => {
  for (const k of Object.keys(env)) delete env[k];
  Object.assign(env, {
    ENCRYPTION_KEY: "k".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://pratonna-app.vercel.app",
    MS_TENANT_ID: "common",
  });
});

describe("token encryption", () => {
  it("round-trips and never stores the token in clear", () => {
    const sealed = encrypt("ya29.secret-token");
    expect(sealed).not.toContain("secret-token");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(decrypt(sealed)).toBe("ya29.secret-token");
    expect(encrypt("same")).not.toBe(encrypt("same")); // random IV
  });

  it("refuses a tampered ciphertext or another key", () => {
    const sealed = encrypt("token");
    const [v, iv, tag, data] = sealed.split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 1;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
    env.ENCRYPTION_KEY = "z".repeat(32);
    expect(() => decrypt(sealed)).toThrow();
  });
});

describe("mail providers", () => {
  it("are not configured without their OAuth app", () => {
    expect(MAIL_PROVIDERS.google.configured()).toBe(false);
    expect(MAIL_PROVIDERS.microsoft.configured()).toBe(false);
    env.GOOGLE_CLIENT_ID = "id";
    env.GOOGLE_CLIENT_SECRET = "secret";
    expect(MAIL_PROVIDERS.google.configured()).toBe(true);
  });

  it("send the user to Google with offline access, the Gmail scopes and the state", () => {
    env.GOOGLE_CLIENT_ID = "google-id";
    const url = new URL(MAIL_PROVIDERS.google.authUrl("nonce123", redirectUri("google")));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://pratonna-app.vercel.app/api/integrations/google/callback",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("nonce123");
    expect(url.searchParams.get("scope")).toContain("gmail.send");
    expect(url.searchParams.get("scope")).toContain("gmail.readonly");
  });

  it("send the user to Microsoft with Mail scopes and the tenant", () => {
    env.MS_CLIENT_ID = "ms-id";
    const url = new URL(MAIL_PROVIDERS.microsoft.authUrl("n", redirectUri("microsoft")));
    expect(url.pathname).toBe("/common/oauth2/v2.0/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://pratonna-app.vercel.app/api/integrations/microsoft/callback",
    );
    const scope = url.searchParams.get("scope") ?? "";
    for (const s of ["offline_access", "Mail.Read", "Mail.Send"]) expect(scope).toContain(s);
  });
});
