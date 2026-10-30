import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MailboxCard } from "@/components/email/MailboxCard";
import { requireRole } from "@/lib/auth/session";
import { emailAccounts } from "@/lib/email/accounts";
import { EMAIL_PROVIDERS, MAIL_PROVIDERS } from "@/lib/email/providers";
import styles from "@/components/email/email.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("integrations"))("title") };
}

const NOTICES = ["notConfigured", "denied", "state", "failed", "unknown"] as const;

/** Gmail and Outlook: connect a mailbox, see what is connected, disconnect. */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const profile = await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const { connected, error } = await searchParams;
  const t = await getTranslations("integrations");
  const accounts = await emailAccounts(profile.id);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      {connected && (EMAIL_PROVIDERS as readonly string[]).includes(connected) ? (
        <p className={`${styles.notice} ${styles.success}`} role="status">
          {t("connected", { provider: t(`providers.${connected}`) })}
        </p>
      ) : null}
      {error && (NOTICES as readonly string[]).includes(error) ? (
        <p className={`${styles.notice} ${styles.error}`} role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
      <div className={styles.providers}>
        {EMAIL_PROVIDERS.map((id) => (
          <MailboxCard
            key={id}
            provider={id}
            configured={MAIL_PROVIDERS[id].configured()}
            accounts={accounts.filter((a) => a.provider === id)}
          />
        ))}
      </div>
    </div>
  );
}
