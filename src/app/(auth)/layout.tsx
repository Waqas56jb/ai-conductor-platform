import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import styles from "./auth.module.css";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className={styles.page}>
      <aside className={styles.visual} aria-hidden="true">
        <div className={styles.grid} />
        <span className={`${styles.orb} ${styles.orbBlue}`} />
        <span className={`${styles.orb} ${styles.orbViolet}`} />
        <div className={styles.visualInner}>
          <p className={styles.visualTitle}>{t("visualTitle")}</p>
          <p className={styles.visualText}>{t("visualText")}</p>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.top}>
          <Link href="/login" className={styles.brand}>
            <span className={styles.logo} aria-hidden="true" />
            Pratonna
          </Link>
          <LanguageSwitcher />
        </div>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}
