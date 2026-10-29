"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { Button, Input } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { FormAlert } from "./FormAlert";
import styles from "./AuthForm.module.css";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tv = useTranslations("validation");
  const [state, action, pending] = useActionState(requestPasswordReset, initialFormState);

  return (
    <>
      <div className={styles.head}>
        <h1>{t("title")}</h1>
        <p>{t("sub")}</p>
      </div>
      <form action={action} className={styles.form} noValidate>
        <FormAlert
          messageKey={state.message}
          tone={state.status === "success" ? "success" : "error"}
        />
        <Input
          label={t("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email ? tv(state.fieldErrors.email) : undefined}
        />
        <Button type="submit" block loading={pending}>
          {t("submit")}
        </Button>
      </form>
      <p className={styles.footer}>
        <Link href="/login" className={styles.link}>
          {t("back")}
        </Link>
      </p>
    </>
  );
}
