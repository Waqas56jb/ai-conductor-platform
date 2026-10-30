import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Settings } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { NewEmailButton } from "@/components/email/NewEmailButton";
import { Card, EmptyState, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { emailAccounts, openMailbox } from "@/lib/email/accounts";
import type { MailSummary } from "@/lib/email/providers";
import styles from "@/components/email/email.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("emails"))("title") };
}

const INBOX_SIZE = 25;

/** The inbox of one of the user's connected mailboxes, read live from Gmail / Outlook. */
export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const profile = await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const { a } = await searchParams;
  const [t, format] = await Promise.all([getTranslations("emails"), getFormatter()]);
  const accounts = await emailAccounts(profile.id);
  const current = accounts.find((x) => x.id === a) ?? accounts[0];

  const header = (
    <div className="page-header">
      <div>
        <h1>{t("title")}</h1>
        <p>{t("sub")}</p>
      </div>
      <div className={styles.toolbar}>
        {current ? <NewEmailButton accountId={current.id} from={current.email} /> : null}
        <Link
          href="/app/settings/integrations"
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          <Settings aria-hidden="true" />
          {t("manage")}
        </Link>
      </div>
    </div>
  );

  if (!current) {
    return (
      <div className="stack">
        {header}
        <Card>
          <EmptyState
            icon={<Inbox />}
            title={t("noAccount")}
            text={t("noAccountText")}
            action={
              <Link href="/app/settings/integrations" className={buttonClass()}>
                {t("connect")}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  let messages: MailSummary[] = [];
  let failed = false;
  const box = await openMailbox(profile.id, current.id);
  if (!box) failed = true;
  else {
    try {
      messages = await box.provider.inbox(box.accessToken, INBOX_SIZE);
    } catch (e) {
      console.error("[email] inbox failed", e);
      failed = true;
    }
  }

  return (
    <div className="stack">
      {header}
      {accounts.length > 1 ? (
        <nav className={styles.toolbar} aria-label={t("accounts")}>
          {accounts.map((x) => (
            <Link
              key={x.id}
              href={`/app/emails?a=${x.id}`}
              aria-current={x.id === current.id ? "page" : undefined}
              className={buttonClass({
                variant: x.id === current.id ? "primary" : "ghost",
                size: "sm",
              })}
            >
              {x.email}
            </Link>
          ))}
        </nav>
      ) : null}
      <Card title={current.email} flush>
        {failed ? (
          <EmptyState icon={<Inbox />} title={t("unavailable")} text={t("unavailableText")} />
        ) : messages.length ? (
          <ul className={styles.inbox}>
            {messages.map((m) => (
              <li key={m.id} className={m.unread ? styles.unread : ""}>
                <Link href={`/app/emails/${current.id}/${encodeURIComponent(m.id)}`}>
                  <span className={styles.sender}>{m.from}</span>
                  <span className={styles.date}>
                    {m.date
                      ? format.dateTime(new Date(m.date), {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : ""}
                  </span>
                  <strong className={styles.subjectLine}>{m.subject || t("noSubject")}</strong>
                  <span className={styles.snippet}>{m.snippet}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Inbox />} title={t("empty")} />
        )}
      </Card>
    </div>
  );
}
