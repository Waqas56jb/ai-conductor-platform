import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import styles from "@/components/auth/AuthForm.module.css";
import { EmptyState, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.reset"))("title") };
}

/** Reached from the reset email: the link's code was exchanged for a session. */
export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.reset");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        icon={<KeyRound />}
        title={t("title")}
        text={t("expired")}
        action={
          <Link href="/forgot-password" className={buttonClass({ variant: "secondary" })}>
            {t("requestNew")}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className={styles.head}>
        <h1>{t("title")}</h1>
        <p>{t("sub")}</p>
      </div>
      <NewPasswordForm
        passwordLabel={t("password")}
        confirmLabel={t("confirm")}
        submitLabel={t("submit")}
      />
    </>
  );
}
