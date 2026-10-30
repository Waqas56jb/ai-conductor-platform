import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmailComposer } from "@/components/email/EmailComposer";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { openMailbox } from "@/lib/email/accounts";
import type { MailMessage } from "@/lib/email/providers";
import styles from "@/components/email/email.module.css";
import caseStyles from "@/components/cases/cases.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("emails"))("title") };
}

/** "Name <address>" → address. */
const address = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();

export default async function EmailPage({
  params,
}: {
  params: Promise<{ account: string; message: string }>;
}) {
  const profile = await requireRole(["technician", "manager", "director", "accountant", "admin"]);
  const { account, message } = await params;
  const [t, format] = await Promise.all([getTranslations("emails"), getFormatter()]);
  // Only the user's own mailbox opens.
  const box = await openMailbox(profile.id, account);
  if (!box) notFound();
  let mail: MailMessage;
  try {
    mail = await box.provider.message(box.accessToken, decodeURIComponent(message));
  } catch {
    notFound();
  }
  const subject = mail.subject || t("noSubject");

  return (
    <div className="stack">
      <div>
        <Link href={`/app/emails?a=${box.account.id}`} className={caseStyles.back}>
          <ArrowLeft aria-hidden="true" />
          {t("back")}
        </Link>
        <div className="page-header">
          <div>
            <h1>{subject}</h1>
            <div className={styles.meta}>
              <span>{t("fromLine", { from: mail.from })}</span>
              {mail.date ? (
                <span>
                  {format.dateTime(new Date(mail.date), { dateStyle: "full", timeStyle: "short" })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <Card>
        <div className={styles.message}>{mail.body}</div>
      </Card>
      <Card title={t("reply")}>
        <EmailComposer
          accountId={box.account.id}
          from={box.account.email}
          replyToId={mail.id}
          defaults={{
            to: address(mail.from),
            subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
          }}
        />
      </Card>
    </div>
  );
}
