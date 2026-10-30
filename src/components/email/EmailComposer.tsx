"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { sendEmail } from "@/app/app/emails/actions";
import { Button, Input, Modal, useToast } from "@/components/ui";
import styles from "./email.module.css";

/**
 * Write or answer an email. Sending is always confirmed: it leaves the
 * company in the user's name.
 */
export function EmailComposer({
  accountId,
  from,
  defaults,
  replyToId = null,
  onSent,
}: {
  accountId: string;
  from: string;
  defaults?: { to?: string; subject?: string };
  replyToId?: string | null;
  onSent?: () => void;
}) {
  const t = useTranslations("emails");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState(defaults?.to ?? "");
  const [subject, setSubject] = useState(defaults?.subject ?? "");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const ready = to.trim() && subject.trim() && body.trim();

  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) setConfirm(true);
      }}
    >
      <p className={styles.from}>{t("from", { email: from })}</p>
      <Input
        label={t("to")}
        type="email"
        value={to}
        required
        onChange={(e) => setTo(e.target.value)}
      />
      <Input
        label={t("subject")}
        value={subject}
        required
        maxLength={250}
        onChange={(e) => setSubject(e.target.value)}
      />
      <div className={styles.bodyField}>
        <label htmlFor={`body-${replyToId ?? "new"}`}>{t("body")}</label>
        <textarea
          id={`body-${replyToId ?? "new"}`}
          rows={7}
          value={body}
          maxLength={20000}
          required
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit" disabled={!ready}>
          <Send aria-hidden="true" />
          {replyToId ? t("reply") : t("send")}
        </Button>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("confirmTitle")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await sendEmail({ accountId, to, subject, body, replyToId });
                  setConfirm(false);
                  if (r.ok) {
                    toast(t("sent"));
                    setBody("");
                    onSent?.();
                    router.refresh();
                  } else toast(tAll(r.error), "error");
                })
              }
            >
              <Send aria-hidden="true" />
              {t("send")}
            </Button>
          </>
        }
      >
        {t("confirmText", { to, subject })}
      </Modal>
    </form>
  );
}
