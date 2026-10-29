"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, PenLine } from "lucide-react";
import { declineQuote } from "@/app/app/cases/actions";
import { startQuoteSigning, syncSignature } from "@/app/app/quotes/actions";
import { Badge, Button, Modal, buttonClass, useToast, type BadgeTone } from "@/components/ui";
import type { SignatureRequestRow } from "@/lib/db/types";
import styles from "./CaseActions.module.css";

type Signature = Pick<SignatureRequestRow, "id" | "status">;

const TONE: Record<Signature["status"], BadgeTone> = {
  sent: "info",
  delivered: "info",
  completed: "success",
  declined: "danger",
  voided: "neutral",
};

/**
 * The client's side of a quote sent to them: sign it with DocuSign (embedded,
 * in a modal) or decline it. Without DocuSign keys, signing is shown as not
 * configured and disabled.
 */
export function QuoteSignature({
  quoteId,
  incidentId,
  configured,
  signature,
  signable,
}: {
  quoteId: string;
  incidentId: string;
  configured: boolean;
  signature: Signature | null;
  /** The quote is still waiting for the client. */
  signable: boolean;
}) {
  const t = useTranslations("quotes.sign");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signing, setSigning] = useState<{ url: string; requestId: string } | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // The DocuSign frame lands on /esign/return, which posts back here.
  useEffect(() => {
    if (!signing) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "pratonna:esign") return;
      const done = e.data.event === "signing_complete";
      setSigning(null);
      startTransition(async () => {
        await syncSignature(signing.requestId);
        toast(done ? t("completed") : t("closed"));
        router.refresh();
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [signing, router, t, toast]);

  const sign = () =>
    startTransition(async () => {
      const r = await startQuoteSigning(quoteId);
      if (r.ok) setSigning({ url: r.url, requestId: r.requestId });
      else toast(tAll(r.error), "error");
    });

  const decline = () =>
    startTransition(async () => {
      const r = await declineQuote(incidentId);
      setConfirmDecline(false);
      if (r.ok) toast(tAll("cases.actions.done"));
      else toast(tAll(r.error), "error");
    });

  return (
    <div className={styles.stack}>
      <div className={styles.inline}>
        {signable ? (
          <>
            <Button onClick={sign} loading={pending && !confirmDecline} disabled={!configured}>
              <PenLine aria-hidden="true" />
              {t("sign")}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDecline(true)}>
              {tAll("cases.actions.decline")}
            </Button>
          </>
        ) : null}
        <a
          href={`/api/quotes/${quoteId}/pdf`}
          target="_blank"
          rel="noopener"
          className={buttonClass({ variant: "ghost", size: "sm" })}
        >
          <Download aria-hidden="true" />
          {signature?.status === "completed" ? t("downloadSigned") : t("download")}
        </a>
        {signature ? (
          <Badge tone={TONE[signature.status]}>{t(`status.${signature.status}`)}</Badge>
        ) : null}
      </div>
      {signable && !configured ? (
        <p className={styles.note} role="note" data-testid="esign-not-configured">
          {t("notConfigured")}
        </p>
      ) : null}

      <Modal
        open={signing !== null}
        onClose={() => setSigning(null)}
        title={t("modalTitle")}
        closeLabel={tAll("common.close")}
        size="large"
      >
        {signing ? (
          <iframe
            src={signing.url}
            title={t("modalTitle")}
            className={styles.signingFrame}
            allow="clipboard-write"
          />
        ) : null}
      </Modal>

      <Modal
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        title={t("declineTitle")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDecline(false)}>
              {tAll("common.cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={decline}>
              {tAll("cases.actions.decline")}
            </Button>
          </>
        }
      >
        {t("declineConfirm")}
      </Modal>
    </div>
  );
}
