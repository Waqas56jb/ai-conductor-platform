"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BellRing, CheckCheck, Download, Upload, XCircle } from "lucide-react";
import { sendInvoiceReminder, uploadReceipt } from "@/app/app/cases/actions";
import { recordPayment, rejectReceipt, type PaymentInput } from "@/app/app/invoices/actions";
import { Button, Input, Modal, Select, buttonClass, useToast } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/db/types";
import { resizeImage } from "@/lib/images";
import styles from "./CaseActions.module.css";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

/**
 * Client: upload proof of payment. Accounting: record a payment (partial or
 * full), refuse a receipt, send a reminder. Each is confirmed first.
 */
export function InvoiceActions({
  invoiceId,
  canUpload,
  canManage,
  remaining = 0,
  underReview = false,
}: {
  invoiceId: string;
  canUpload: boolean;
  canManage: boolean;
  /** What is left to pay (TTC). */
  remaining?: number;
  underReview?: boolean;
}) {
  const t = useTranslations("cases.invoice");
  const tp = useTranslations("invoices.payment");
  const tAll = useTranslations();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<"paid" | "remind" | "reject" | null>(null);
  const [payment, setPayment] = useState<PaymentInput>({
    amount: "",
    method: "transfer",
    paidAt: today(),
    reference: "",
    notes: "",
  });
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast(tAll("cases.actions.done"));
        setErrors({});
        after?.();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast(tAll(r.error), "error");
      }
    });

  const openPayment = () => {
    setPayment((p) => ({ ...p, amount: remaining.toFixed(2), paidAt: today() }));
    setErrors({});
    setOpen("paid");
  };
  const field = (key: keyof PaymentInput) =>
    errors[key] ? tAll(`validation.${errors[key]}`) : undefined;
  const close = () => setOpen(null);

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
          <Button size="sm" loading={pending} onClick={openPayment}>
            <CheckCheck aria-hidden="true" />
            {t("markPaid")}
          </Button>
          {underReview ? (
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => {
                setNote("");
                setErrors({});
                setOpen("reject");
              }}
            >
              <XCircle aria-hidden="true" />
              {t("rejectReceipt")}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" loading={pending} onClick={() => setOpen("remind")}>
            <BellRing aria-hidden="true" />
            {t("remind")}
          </Button>
        </div>
      ) : null}

      <Modal
        open={open === "paid"}
        onClose={close}
        title={t("markPaid")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tAll("common.cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() => run(() => recordPayment(invoiceId, payment, underReview), close)}
            >
              {tAll("cases.actions.confirm")}
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          <p className={styles.muted}>
            {underReview ? tp("fromReceipt") : tp("intro", { remaining: remaining.toFixed(2) })}
          </p>
          <div className={styles.inline}>
            <Input
              label={tp("amount")}
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={String(payment.amount)}
              error={field("amount")}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
            />
            <Input
              label={tp("date")}
              type="date"
              value={String(payment.paidAt)}
              error={field("paidAt")}
              onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })}
            />
          </div>
          <Select
            label={tp("method")}
            value={payment.method}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: tp(`methods.${m}`) }))}
            onChange={(e) =>
              setPayment({ ...payment, method: e.target.value as PaymentInput["method"] })
            }
          />
          <Input
            label={tp("reference")}
            optionalLabel={tAll("common.optional")}
            value={String(payment.reference)}
            maxLength={120}
            error={field("reference")}
            onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={open === "reject"}
        onClose={close}
        title={t("rejectReceipt")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => run(() => rejectReceipt(invoiceId, note), close)}
            >
              {t("rejectReceipt")}
            </Button>
          </>
        }
      >
        <label className={styles.label}>
          {t("rejectReason")}
          <textarea
            className={styles.textarea}
            rows={3}
            maxLength={500}
            value={note}
            aria-invalid={errors.note ? true : undefined}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </Modal>

      <Modal
        open={open === "remind"}
        onClose={close}
        title={t("remind")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tAll("common.cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() => run(() => sendInvoiceReminder(invoiceId), close)}
            >
              {tAll("cases.actions.confirm")}
            </Button>
          </>
        }
      >
        {t("remindConfirm")}
      </Modal>
    </div>
  );
}
