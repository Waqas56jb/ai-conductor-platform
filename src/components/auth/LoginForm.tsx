"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/app/(auth)/actions";
import { Button, Input } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { FormAlert } from "./FormAlert";
import styles from "./AuthForm.module.css";

/** `notice` is a message key from the URL (signed out, bad link, no profile). */
export function LoginForm({
  next,
  notice,
}: {
  next?: string;
  notice?: { key: string; tone: "error" | "success" };
}) {
  const t = useTranslations("auth.login");
  const tv = useTranslations("validation");
  const [state, action, pending] = useActionState(login, initialFormState);
  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;

  return (
    <>
      <div className={styles.head}>
        <h1>{t("title")}</h1>
        <p>{t("sub")}</p>
      </div>
      <form action={action} className={styles.form} noValidate>
        {state.status === "idle" && notice ? (
          <FormAlert messageKey={notice.key} tone={notice.tone} />
        ) : null}
        <FormAlert messageKey={state.message} tone="error" />
        <input type="hidden" name="next" value={next ?? ""} />
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
          autoComplete="current-password"
          required
          error={err("password")}
        />
        <div className={styles.row}>
          <Link href="/forgot-password" className={styles.link}>
            {t("forgot")}
          </Link>
        </div>
        <Button type="submit" block loading={pending}>
          {t("submit")}
        </Button>
      </form>
      <p className={styles.footer}>
        {t("noAccount")}{" "}
        <Link href="/signup" className={styles.link}>
          {t("signupLink")}
        </Link>
      </p>
    </>
  );
}
