import { z } from "zod";

// Empty strings (e.g. `KEY=` in .env) count as unset.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const required = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);
const withDefault = (value: string) =>
  z.preprocess((v) => (v === "" || v === undefined ? value : v), z.string().min(1));

export const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: required(z.url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required(z.string().min(1)),
  NEXT_PUBLIC_APP_URL: withDefault("http://localhost:3000").pipe(z.url()),
  /** Marketing site (legacy/client); signed-out visitors of "/" are sent there. */
  NEXT_PUBLIC_SITE_URL: optional(z.url()),
  /** Web push (VAPID) public key; push stays off without it. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optional(z.string().min(20)),
});

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: required(z.string().min(1)),
  // Only used by the migration / seed scripts, not by the app at runtime.
  DATABASE_URL: optional(z.url()),
  DIRECT_URL: optional(z.url()),
  OPENAI_API_KEY: required(z.string().min(1)),
  OPENAI_TEXT_MODEL: withDefault("gpt-4.1"),
  OPENAI_REALTIME_MODEL: withDefault("gpt-realtime"),
  ENCRYPTION_KEY: required(z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters")),
  // DocuSign eSignature (JWT grant). All optional: without them, signing is
  // shown as "not configured" and disabled.
  DOCUSIGN_INTEGRATION_KEY: optional(z.string().min(1)),
  DOCUSIGN_USER_ID: optional(z.string().min(1)),
  DOCUSIGN_ACCOUNT_ID: optional(z.string().min(1)),
  /** RSA private key (PEM; "
" escapes accepted). */
  DOCUSIGN_PRIVATE_KEY: optional(z.string().min(1)),
  /** REST base URL: the demo sandbox unless set. */
  DOCUSIGN_BASE_URL: withDefault("https://demo.docusign.net/restapi").pipe(z.url()),
  /** Connect HMAC key, to verify webhooks. */
  DOCUSIGN_WEBHOOK_SECRET: optional(z.string().min(1)),
  VAPID_PRIVATE_KEY: optional(z.string().min(20)),
  VAPID_SUBJECT: withDefault("mailto:contact@pratonna.com"),
  /** Bearer token Vercel Cron sends to /api/cron/*. */
  CRON_SECRET: optional(z.string().min(16)),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
export type Env = ClientEnv & ServerEnv;

type Source = Record<string, string | undefined>;

/**
 * Validates the environment. On the server both schemas are checked; in the
 * browser only the public schema is, and reading a server variable throws.
 */
export function parseEnv(source: Source, isServer: boolean): Env {
  const schema = isServer ? clientSchema.extend(serverSchema.shape) : clientSchema;
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  if (isServer) return result.data as Env;

  const serverKeys = new Set(Object.keys(serverSchema.shape));
  return new Proxy(result.data as Env, {
    get(target, prop) {
      if (typeof prop === "string" && serverKeys.has(prop)) {
        throw new Error(`Server-only environment variable "${prop}" accessed on the client`);
      }
      return Reflect.get(target, prop);
    },
  });
}

// Next.js only inlines NEXT_PUBLIC_* vars into the browser bundle when they are
// referenced literally, so every variable is listed explicitly here.
const runtimeEnv: Source = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
  OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  DOCUSIGN_INTEGRATION_KEY: process.env.DOCUSIGN_INTEGRATION_KEY,
  DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID,
  DOCUSIGN_ACCOUNT_ID: process.env.DOCUSIGN_ACCOUNT_ID,
  DOCUSIGN_PRIVATE_KEY: process.env.DOCUSIGN_PRIVATE_KEY,
  DOCUSIGN_BASE_URL: process.env.DOCUSIGN_BASE_URL,
  DOCUSIGN_WEBHOOK_SECRET: process.env.DOCUSIGN_WEBHOOK_SECRET,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  CRON_SECRET: process.env.CRON_SECRET,
};

// Set SKIP_ENV_VALIDATION=1 for builds/CI/tests that run without real secrets.
export const env: Env = process.env.SKIP_ENV_VALIDATION
  ? (runtimeEnv as Env)
  : parseEnv(runtimeEnv, typeof window === "undefined");
