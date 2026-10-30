"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Plug, Unplug } from "lucide-react";
import { disconnectMailbox } from "@/app/app/emails/actions";
import { Badge, Button, Card, Modal, buttonClass, useToast } from "@/components/ui";
import type { EmailAccount } from "@/lib/email/accounts";
import type { EmailProviderId } from "@/lib/email/providers";
import styles from "./email.module.css";

/** One provider: not configured, or its connected mailboxes and a connect button. */
export function MailboxCard({
  provider,
  configured,
  accounts,
}: {
  provider: EmailProviderId;
  configured: boolean;
  accounts: EmailAccount[];
}) {
  const t = useTranslations("integrations");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<EmailAccount | null>(null);

  return (
    <Card
      title={t(`providers.${provider}`)}
      description={t(`descriptions.${provider}`)}
      data-testid={`provider-${provider}`}
      actions={
        configured ? (
          <Badge tone={accounts.length ? "success" : "neutral"}>
            {accounts.length ? t("status.connected") : t("status.available")}
          </Badge>
        ) : (
          <Badge tone="warning">{t("status.notConfigured")}</Badge>
        )
      }
    >
      <div className="stack">
        {accounts.length ? (
          <ul className={styles.accounts}>
            {accounts.map((a) => (
              <li key={a.id}>
                <Mail aria-hidden="true" />
                <span>
                  <strong>{a.email}</strong>
                  {a.status !== "connected" ? (
                    <Badge tone="danger">{t(`accountStatus.${a.status}`)}</Badge>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoving(a)}
                  aria-label={`${t("disconnect")} : ${a.email}`}
                >
                  <Unplug aria-hidden="true" />
                  {t("disconnect")}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {configured ? (
          // A full navigation: the provider's consent screen is another site.
          <a
            href={`/api/integrations/${provider}/connect`}
            className={buttonClass({ variant: "secondary" })}
          >
            <Plug aria-hidden="true" />
            {accounts.length ? t("connectAnother") : t("connect")}
          </a>
        ) : (
          <div className={styles.unconfigured} role="note">
            <Button variant="secondary" disabled>
              <Plug aria-hidden="true" />
              {t("connect")}
            </Button>
            <p>{t("notConfiguredText")}</p>
          </div>
        )}
      </div>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("disconnect")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                removing &&
                startTransition(async () => {
                  const r = await disconnectMailbox(removing.id);
                  setRemoving(null);
                  if (r.ok) toast(t("disconnected"));
                  else toast(tAll(r.error), "error");
                  router.refresh();
                })
              }
            >
              {t("disconnect")}
            </Button>
          </>
        }
      >
        {removing ? t("disconnectConfirm", { email: removing.email }) : null}
      </Modal>
    </Card>
  );
}
