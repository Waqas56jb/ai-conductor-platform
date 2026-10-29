"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "@/app/(auth)/actions";
import { Button, Input, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { FormAlert } from "./FormAlert";
import styles from "./AuthForm.module.css";

/** Used by /reset-password (after an email link) and the profile Security tab. */
export function NewPasswordForm({
  passwordLabel,
  confirmLabel,
  submitLabel,
  onSuccess,
}: {
  passwordLabel: string;
  confirmLabel: string;
  submitLabel: string;
  onSuccess?: "toast" | "alert";
}) {
  const tv = useTranslations("validation");
  const t = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updatePassword, initialFormState);
  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;

  useEffect(() => {
    if (onSuccess === "toast" && state.status === "success" && state.message)
      toast(t(state.message));
  }, [state, onSuccess, toast, t]);

  return (
    <form action={action} className={styles.form} noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      {state.status === "success" && onSuccess !== "toast" ? (
        <FormAlert messageKey={state.message} tone="success" />
      ) : null}
      <Input
        label={passwordLabel}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={err("password")}
      />
      <Input
        label={confirmLabel}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={err("confirm")}
      />
      <Button type="submit" block loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
