"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Download, FilePlus2, PenLine, Send } from "lucide-react";
import {
  cancelContract,
  createContract,
  sendContract,
  startContractSigning,
  type ContractInput,
} from "@/app/app/contracts/actions";
import { useEmbeddedSigning } from "@/components/esign/useEmbeddedSigning";
import { Button, Input, Modal, Select, buttonClass, useToast } from "@/components/ui";
import type { ContractRow } from "@/lib/db/types";
import { VAT_RATES } from "@/lib/workflows/devis";
import styles from "./contracts.module.css";

type Result = { ok: true } | { ok: false; error: string };

/** PDF, then by role: send / cancel (office, confirmed) or sign (client, DocuSign). */
export function ContractActions({
  id,
  reference,
  status,
  role,
  esignConfigured,
}: {
  id: string;
  reference: string;
  status: ContractRow["status"];
  role: "office" | "client" | "viewer";
  esignConfigured: boolean;
}) {
  const t = useTranslations("contracts");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"send" | "cancel" | null>(null);
  const signing = useEmbeddedSigning(() => startContractSigning(id));

  const run = (action: () => Promise<Result>, done: string) =>
    startTransition(async () => {
      const r = await action();
      setConfirm(null);
      if (r.ok) toast(done);
      else toast(tAll(r.error), "error");
      router.refresh();
    });

  return (
    <div className={styles.actions}>
      <a
        href={`/api/documents/contract/${id}`}
        target="_blank"
        rel="noopener"
        className={buttonClass({ variant: "ghost", size: "sm" })}
      >
        <Download aria-hidden="true" />
        {status === "signed" ? t("downloadSigned") : t("download")}
      </a>
      {role === "office" && status === "draft" ? (
        <Button size="sm" onClick={() => setConfirm("send")}>
          <Send aria-hidden="true" />
          {t("send")}
        </Button>
      ) : null}
      {role === "office" && (status === "draft" || status === "sent") ? (
        <Button size="sm" variant="ghost" onClick={() => setConfirm("cancel")}>
          <Ban aria-hidden="true" />
          {t("cancel")}
        </Button>
      ) : null}
      {role === "client" && status === "sent" ? (
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
      {signing.modal}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "send" ? t("send") : t("cancel")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant={confirm === "cancel" ? "danger" : "primary"}
              loading={pending}
              onClick={() =>
                confirm === "send"
                  ? run(() => sendContract(id), t("sent"))
                  : run(() => cancelContract(id), t("cancelled"))
              }
            >
              {confirm === "send" ? t("send") : t("cancel")}
            </Button>
          </>
        }
      >
        {confirm === "send" ? t("sendConfirm", { reference }) : t("cancelConfirm", { reference })}
      </Modal>
    </div>
  );
}

/** Office: draft a new contract for one of the company's clients. */
export function NewContractButton({ clients }: { clients: { id: string; name: string }[] }) {
  const t = useTranslations("contracts");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<ContractInput>({
    clientId: "",
    title: "",
    terms: "",
    startDate: today,
    endDate: "",
    billing: "yearly",
    amountHt: "",
    taxRate: "20",
  } as unknown as ContractInput);
  const set = (key: keyof ContractInput) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [key]: e.target.value }));
  const err = (key: string) => (errors[key] ? tAll(`validation.${errors[key]}`) : undefined);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!clients.length}>
        <FilePlus2 aria-hidden="true" />
        {t("new")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("new")}
        closeLabel={tAll("common.close")}
        size="large"
      >
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await createContract(v);
              if (r.ok) {
                toast(t("created"));
                setOpen(false);
                setErrors({});
                router.refresh();
              } else {
                setErrors(r.fieldErrors ?? {});
                toast(tAll(r.error), "error");
              }
            });
          }}
        >
          <Select
            label={t("client")}
            value={String(v.clientId)}
            placeholder={t("chooseClient")}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            onChange={set("clientId")}
            error={err("clientId")}
            required
          />
          <Input
            label={t("titleLabel")}
            value={String(v.title)}
            onChange={set("title")}
            maxLength={200}
            required
            error={err("title")}
          />
          <Input
            label={t("start")}
            type="date"
            value={String(v.startDate)}
            onChange={set("startDate")}
            required
            error={err("startDate")}
          />
          <Input
            label={t("end")}
            type="date"
            value={String(v.endDate)}
            onChange={set("endDate")}
            optionalLabel={tAll("common.optional")}
            error={err("endDate")}
          />
          <Select
            label={t("billingLabel")}
            value={String(v.billing)}
            options={(["one_off", "monthly", "yearly"] as const).map((b) => ({
              value: b,
              label: t(`billing.${b}`),
            }))}
            onChange={set("billing")}
          />
          <Input
            label={t("amount")}
            type="number"
            min="0"
            step="0.01"
            value={String(v.amountHt)}
            onChange={set("amountHt")}
            required
            error={err("amountHt")}
          />
          <Select
            label={t("tax")}
            value={String(v.taxRate)}
            options={VAT_RATES.map((r) => ({ value: String(r), label: `${r} %` }))}
            onChange={set("taxRate")}
          />
          <div className={styles.terms}>
            <label htmlFor="contract-terms">{t("terms")}</label>
            <textarea
              id="contract-terms"
              rows={6}
              maxLength={8000}
              value={String(v.terms)}
              onChange={set("terms")}
            />
          </div>
          <div>
            <Button type="submit" loading={pending}>
              {t("create")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
