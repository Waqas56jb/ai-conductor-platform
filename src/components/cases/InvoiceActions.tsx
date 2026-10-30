"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BellRing, CheckCheck, Download, Upload } from "lucide-react";
import {
  markInvoicePaid,
  sendInvoiceReminder,
  uploadReceipt,
  type ActionResult,
} from "@/app/app/cases/actions";
import { Button, Modal, buttonClass, useToast } from "@/components/ui";
import { resizeImage } from "@/lib/images";
import styles from "./CaseActions.module.css";

/** Client: upload proof of payment. Staff: confirm payment / send a reminder. */
export function InvoiceActions({
  invoiceId,
  canUpload,
  canManage,
}: {
  invoiceId: string;
  canUpload: boolean;
  canManage: boolean;
}) {
  const t = useTranslations("cases.invoice");
  const tAll = useTranslations();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  // Payments and reminders to the client are confirmed before they happen.
  const [confirm, setConfirm] = useState<"paid" | "remind" | null>(null);

  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast(tAll("cases.actions.done"));
        after?.();
      } else toast(tAll(r.error), "error");
    });

  return (
    <div className={styles.stack}>
      <a
        href={`/api/documents/invoice/${invoiceId}`}
        target="_blank"
        rel="noopener"
        className={buttonClass({ variant: "ghost", size: "sm" })}
      >
        <Download aria-hidden="true" />
        {t("pdf")}
      </a>
      {canUpload ? (
        <div className={styles.inline}>
          <label className={styles.fileLabel}>
            {t("receipt")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              data-testid={`receipt-input-${invoiceId}`}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            disabled={!file}
            loading={pending}
            onClick={() =>
              run(
                async () => {
                  const fd = new FormData();
                  if (file)
                    fd.append(
                      "receipt",
                      file.type.startsWith("image/") ? await resizeImage(file) : file,
                    );
                  return uploadReceipt(invoiceId, fd);
                },
                () => setFile(null),
              )
            }
          >
            <Upload aria-hidden="true" />
            {t("uploadReceipt")}
          </Button>
        </div>
      ) : null}
      {canManage ? (
        <div className={styles.inline}>
          <Button size="sm" loading={pending} onClick={() => setConfirm("paid")}>
            <CheckCheck aria-hidden="true" />
            {t("markPaid")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() => setConfirm("remind")}
          >
            <BellRing aria-hidden="true" />
            {t("remind")}
          </Button>
        </div>
      ) : null}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "paid" ? t("markPaid") : t("remind")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                run(
                  () =>
                    confirm === "paid"
                      ? markInvoicePaid(invoiceId)
                      : sendInvoiceReminder(invoiceId),
                  () => setConfirm(null),
                )
              }
            >
              {tAll("cases.actions.confirm")}
            </Button>
          </>
        }
      >
        {confirm === "paid" ? t("markPaidConfirm") : t("remindConfirm")}
      </Modal>
    </div>
  );
}
