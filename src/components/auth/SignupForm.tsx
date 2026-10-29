"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signup } from "@/app/(auth)/actions";
import { Button, Input } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { FormAlert } from "./FormAlert";
import styles from "./AuthForm.module.css";

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const tv = useTranslations("validation");
  const [state, action, pending] = useActionState(signup, initialFormState);
  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;

  return (
    <>
      <div className={styles.head}>
        <h1>{t("title")}</h1>
        <p>{t("sub")}</p>
      </div>
      <form action={action} className={styles.form} noValidate>
        <FormAlert messageKey={state.message} tone="error" />
        <Input
          label={t("fullName")}
          name="fullName"
          autoComplete="name"
          required
          defaultValue={state.values?.fullName}
          error={err("fullName")}
        />
        <Input
          label={t("company")}
          name="companyName"
          autoComplete="organization"
          required
          defaultValue={state.values?.companyName}
          error={err("companyName")}
        />
        <Input
          label={t("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={err("email")}
        />
        <Input
          label={t("password")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint={t("passwordHint")}
          error={err("password")}
        />
        <Button type="submit" block loading={pending}>
          {t("submit")}
        </Button>
      </form>
      <p className={styles.footer}>
        {t("hasAccount")}{" "}
        <Link href="/login" className={styles.link}>
          {t("loginLink")}
        </Link>
      </p>
    </>
  );
}
