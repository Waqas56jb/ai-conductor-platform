/** Result of a server action backing a form (used with useActionState). */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Message key for the whole form. */
  message?: string;
  /** Message key per field (validation namespace). */
  fieldErrors?: Record<string, string>;
  /** Submitted values, so the form keeps them after an error. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** Reads string fields from FormData (files and missing fields become ""). */
export function formValues<K extends string>(
  formData: FormData,
  keys: readonly K[],
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === "string" ? value : "";
  }
  return out;
}
