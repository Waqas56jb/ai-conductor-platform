"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2, Pencil } from "lucide-react";
import { createServiceOrder, updateServiceOrder } from "@/app/app/service-orders/actions";
import { Button, Input, Modal, Select, useToast } from "@/components/ui";
import { VAT_RATES } from "@/lib/workflows/devis";
import type { ServiceOrderInput } from "@/lib/workflows/service-order";
import styles from "./service-orders.module.css";

type Values = Record<keyof ServiceOrderInput, string>;

const EMPTY: Values = {
  title: "",
  description: "",
  supplierName: "",
  supplierEmail: "",
  supplierSiret: "",
  incidentId: "",
  startDate: "",
  endDate: "",
  amountHt: "",
  taxRate: "20",
};

/** Office: draft a new service order, or correct a draft. */
export function ServiceOrderForm({
  id,
  initial,
  cases,
}: {
  /** Set when editing a draft. */
  id?: string;
  initial?: Values;
  cases: { id: string; label: string }[];
}) {
  const t = useTranslations("serviceOrders");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState<Values>(initial ?? EMPTY);
  const set = (key: keyof Values) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [key]: e.target.value }));
  const err = (key: string) => (errors[key] ? tAll(`validation.${errors[key]}`) : undefined);
  const title = id ? t("edit") : t("new");

  return (
    <>
      <Button
        variant={id ? "secondary" : "primary"}
        size={id ? "sm" : "md"}
        onClick={() => {
          setV(initial ?? { ...EMPTY, startDate: new Date().toISOString().slice(0, 10) });
          setErrors({});
          setOpen(true);
        }}
      >
        {id ? <Pencil aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
        {title}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={tAll("common.close")}
        size="large"
      >
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = id ? await updateServiceOrder(id, v) : await createServiceOrder(v);
              if (r.ok) {
                toast(id ? t("updated") : t("created"));
                setOpen(false);
                setErrors({});
                if (!id && "id" in r) router.push(`/app/service-orders/${r.id}`);
                else router.refresh();
              } else {
                setErrors(r.fieldErrors ?? {});
                toast(tAll(r.error), "error");
              }
            });
          }}
        >
          <Input
            label={t("fields.title")}
            value={v.title}
            onChange={set("title")}
            maxLength={200}
            required
            error={err("title")}
          />
          <Input
            label={t("fields.supplierName")}
            value={v.supplierName}
            onChange={set("supplierName")}
            maxLength={200}
            required
            error={err("supplierName")}
          />
          <Input
            label={t("fields.supplierEmail")}
            type="email"
            value={v.supplierEmail}
            onChange={set("supplierEmail")}
            required
            hint={t("fields.supplierEmailHint")}
            error={err("supplierEmail")}
          />
          <Input
            label={t("fields.supplierSiret")}
            inputMode="numeric"
            value={v.supplierSiret}
            onChange={set("supplierSiret")}
            maxLength={14}
            optionalLabel={tAll("common.optional")}
            error={err("supplierSiret")}
          />
          <Select
            label={t("fields.case")}
            value={v.incidentId}
            options={[
              { value: "", label: t("fields.noCase") },
              ...cases.map((c) => ({ value: c.id, label: c.label })),
            ]}
            onChange={set("incidentId")}
            error={err("incidentId")}
          />
          <Input
            label={t("fields.start")}
            type="date"
            value={v.startDate}
            onChange={set("startDate")}
            required
            error={err("startDate")}
          />
          <Input
            label={t("fields.end")}
            type="date"
            value={v.endDate}
            onChange={set("endDate")}
            optionalLabel={tAll("common.optional")}
            error={err("endDate")}
          />
          <Input
            label={t("fields.amount")}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={v.amountHt}
            onChange={set("amountHt")}
            required
            error={err("amountHt")}
          />
          <Select
            label={t("fields.tax")}
            value={v.taxRate}
            options={VAT_RATES.map((r) => ({ value: String(r), label: `${r} %` }))}
            onChange={set("taxRate")}
          />
          <div className={styles.textField}>
            <label htmlFor="service-order-description">{t("fields.description")}</label>
            <textarea
              id="service-order-description"
              rows={5}
              maxLength={8000}
              value={v.description}
              onChange={set("description")}
            />
          </div>
          <div className={styles.submit}>
            <Button type="submit" loading={pending}>
              {id ? tAll("common.save") : t("create")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
