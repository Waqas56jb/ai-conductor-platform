import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Secrets at rest (OAuth tokens): AES-256-GCM with a key derived from
 * ENCRYPTION_KEY. Format: "v1.<iv>.<tag>.<ciphertext>", base64url parts.
 */
const VERSION = "v1";

const key = () => createHash("sha256").update(env.ENCRYPTION_KEY).digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decrypt(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("unsupported ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
