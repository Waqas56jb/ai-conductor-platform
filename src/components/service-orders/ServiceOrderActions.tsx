"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, CheckCheck, Download, PenLine, Send, Undo2 } from "lucide-react";
import { decideServiceOrder, startServiceOrderSigning } from "@/app/app/service-orders/actions";
import { useEmbeddedSigning } from "@/components/esign/useEmbeddedSigning";
import { Button, Modal, buttonClass, useToast } from "@/components/ui";
import type { ServiceOrderStatus } from "@/lib/workflows/service-order";
import styles from "./service-orders.module.css";

type Decision = "submit" | "approve" | "reject" | "cancel";

/**
 * What the current user can do at this step of the chain. Every decision is
 * confirmed in a dialog; a refusal needs a reason.
 */
export function ServiceOrderActions({
  id,
  reference,
  status,
  can,
  esignConfigured,
}: {
  id: string;
  reference: string;
  status: ServiceOrderStatus;
  can: { submit: boolean; approve: boolean; sign: boolean; cancel: boolean };
  esignConfigured: boolean;
}) {
  const t = useTranslations("serviceOrders");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const signing = useEmbeddedSigning(() => startServiceOrderSigning(id));

  const ask = (d: Decision) => {
    setNote("");
    setConfirm(d);
  };
  const decide = (d: Decision) =>
    startTransition(async () => {
      const r = await decideServiceOrder(id, d, note);
      if (r.ok) {
        setConfirm(null);
        toast(t(`done.${d}`));
        router.refresh();
      } else toast(tAll(r.error), "error");
    });

  const approveLabel = status === "funds_check" ? t("approveFunds") : t("approveAccounting");
  const label = (d: Decision) =>
    d === "approve"
      ? approveLabel
      : d === "submit"
        ? t("submit")
        : t(d === "reject" ? "reject" : "cancel");

  return (
    <div className={styles.actions}>
      <a
        href={`/api/documents/service-order/${id}`}
        target="_blank"
        rel="noopener"
        className={buttonClass({ variant: "ghost", size: "sm" })}
      >
        <Download aria-hidden="true" />
        {status === "sent" ? t("downloadSigned") : t("download")}
      </a>
      {can.submit ? (
        <Button size="sm" onClick={() => ask("submit")}>
          <Send aria-hidden="true" />
          {t("submit")}
        </Button>
      ) : null}
      {can.approve ? (
        <>
          <Button size="sm" onClick={() => ask("approve")}>
            <CheckCheck aria-hidden="true" />
            {approveLabel}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => ask("reject")}>
            <Undo2 aria-hidden="true" />
            {t("reject")}
          </Button>
        </>
      ) : null}
      {can.sign ? (
        <>
          <Button
            size="sm"
            onClick={signing.open}
            loading={signing.pending}
            disabled={!esignConfigured}
          >
            <PenLine aria-hidden="true" />
            {t("sign")}
          </Button>
          {!esignConfigured ? (
            <span className={styles.note} role="note">
              {tAll("quotes.sign.notConfigured")}
            </span>
          ) : null}
        </>
      ) : null}
      {can.cancel ? (
        <Button size="sm" variant="ghost" onClick={() => ask("cancel")}>
          <Ban aria-hidden="true" />
          {t("cancel")}
        </Button>
      ) : null}
      {signing.modal}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm ? label(confirm) : ""}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant={confirm === "cancel" || confirm === "reject" ? "danger" : "primary"}
              loading={pending}
              disabled={confirm === "reject" && note.trim().length < 3}
              onClick={() => confirm && decide(confirm)}
            >
              {tAll("cases.actions.confirm")}
            </Button>
          </>
        }
      >
        <div className={styles.confirm}>
          <p>
            {confirm
              ? t(`confirm.${confirm === "approve" ? status : confirm}`, { reference })
              : null}
          </p>
          {confirm === "reject" || confirm === "approve" ? (
            <div className={styles.textField}>
              <label htmlFor="service-order-note">
                {confirm === "reject" ? t("reason") : t("comment")}
              </label>
              <textarea
                id="service-order-note"
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
