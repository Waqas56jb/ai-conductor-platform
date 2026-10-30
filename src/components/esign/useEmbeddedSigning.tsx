"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { syncSignature } from "@/app/app/quotes/actions";
import { Modal, useToast } from "@/components/ui";
import styles from "@/components/cases/CaseActions.module.css";

type Start = () => Promise<
  { ok: true; url: string; requestId: string } | { ok: false; error: string }
>;

/**
 * DocuSign embedded signing in a modal, for any document (quotes, contracts).
 * The frame ends on /esign/return, which posts back here; the status is then
 * read from DocuSign by the server, never trusted from the browser.
 */
export function useEmbeddedSigning(start: Start) {
  const t = useTranslations("quotes.sign");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signing, setSigning] = useState<{ url: string; requestId: string } | null>(null);

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

  const open = () =>
    startTransition(async () => {
      const r = await start();
      if (r.ok) setSigning({ url: r.url, requestId: r.requestId });
      else toast(tAll(r.error), "error");
    });

  const modal = (
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
  );

  return { open, pending, modal };
}
