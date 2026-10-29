import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
};

const validServer = {
  ...validPublic,
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
  OPENAI_API_KEY: "sk-test",
  ENCRYPTION_KEY: "a".repeat(32),
};

describe("parseEnv", () => {
  it("accepts a complete server environment and applies defaults", () => {
    const env = parseEnv(validServer, true);
    expect(env.OPENAI_API_KEY).toBe("sk-test");
    expect(env.OPENAI_TEXT_MODEL).toBe("gpt-4.1");
    expect(env.OPENAI_REALTIME_MODEL).toBe("gpt-realtime");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("keeps explicit model overrides", () => {
    const env = parseEnv({ ...validServer, OPENAI_TEXT_MODEL: "gpt-4.1-mini" }, true);
    expect(env.OPENAI_TEXT_MODEL).toBe("gpt-4.1-mini");
  });

  it("rejects a missing OpenAI key", () => {
    expect(() => parseEnv({ ...validServer, OPENAI_API_KEY: undefined }, true)).toThrow(
      /OPENAI_API_KEY/,
    );
  });

  it("treats empty strings as missing", () => {
    expect(() => parseEnv({ ...validServer, SUPABASE_SERVICE_ROLE_KEY: "" }, true)).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("rejects a short ENCRYPTION_KEY", () => {
    expect(() => parseEnv({ ...validServer, ENCRYPTION_KEY: "short" }, true)).toThrow(
      /ENCRYPTION_KEY/,
    );
  });

  it("requires the public Supabase variables in the browser", () => {
    expect(() => parseEnv({}, false)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(parseEnv(validPublic, false).NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co",
    );
  });

  it("throws when a server variable is read on the client", () => {
    const env = parseEnv(validPublic, false);
    expect(() => env.OPENAI_API_KEY).toThrow(/Server-only/);
  });
});
