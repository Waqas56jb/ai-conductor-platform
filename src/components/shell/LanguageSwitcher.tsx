"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";
import styles from "./shell.module.css";

export function LanguageSwitcher() {
  const t = useTranslations("shell");
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={styles.lang}
      role="group"
      aria-label={t("language")}
      aria-busy={pending || undefined}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={current === locale}
          disabled={pending}
          onClick={() => startTransition(() => setLocale(locale))}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
