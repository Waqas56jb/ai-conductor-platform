import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTO_BUCKET = "ai-conductor-photos";
export const RECEIPT_BUCKET = "ai-conductor-receipts";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECEIPT_TYPES = new Set([...PHOTO_TYPES, "application/pdf"]);
const SIGNED_URL_SECONDS = 60 * 60;

export type UploadError = "too_large" | "bad_type" | "failed";

/** Files from a FormData field, ignoring empty inputs. */
export function filesFrom(formData: FormData, field: string): File[] {
  return formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

/**
 * Uploads into a private bucket under `<company>/<incident>/`. Callers must have
 * already checked that the user may act on the incident.
 */
export async function uploadFile(
  bucket: typeof PHOTO_BUCKET | typeof RECEIPT_BUCKET,
  companyId: string,
  folder: string,
  file: File,
): Promise<{ path: string } | { error: UploadError }> {
  const allowed = bucket === PHOTO_BUCKET ? PHOTO_TYPES : RECEIPT_TYPES;
  if (!allowed.has(file.type)) return { error: "bad_type" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too_large" };

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${companyId}/${folder}/${randomUUID()}.${ext}`;
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  return error ? { error: "failed" } : { path };
}

/** Short-lived URLs for files the caller is already allowed to see. */
export async function signedUrls(
  bucket: typeof PHOTO_BUCKET | typeof RECEIPT_BUCKET,
  paths: readonly string[],
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrls([...paths], SIGNED_URL_SECONDS);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
