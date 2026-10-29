"use client";

import { useTranslations } from "next-intl";
import styles from "./AuthForm.module.css";

/** Translates a form-level message key ("auth.login.invalid") into an alert. */
export function FormAlert({
  messageKey,
  tone,
}: {
  messageKey?: string;
  tone: "error" | "success";
}) {
  const t = useTranslations();
  if (!messageKey) return null;
  return (
    <p
      className={`${styles.alert} ${tone === "error" ? styles.alertError : styles.alertSuccess}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {t(messageKey)}
    </p>
  );
}
