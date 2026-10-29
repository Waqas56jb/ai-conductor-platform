"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import type { QuoteLine } from "@/lib/db/types";
import { approvalRoute } from "@/lib/workflows/incident";
import { computeTotals, VAT_RATES, type DevisInput } from "@/lib/workflows/devis";
import styles from "./DevisEditor.module.css";

type Props = {
  initial: DevisInput;
  threshold: number;
  submitting: boolean;
  onSubmit: (devis: DevisInput) => void;
};

const emptyLine = (): QuoteLine => ({ label: "", quantity: 1, unit_price_ht: 0 });

/** Editable quote: lines, VAT and live totals, with the approval route shown upfront. */
export function DevisEditor({ initial, threshold, submitting, onSubmit }: Props) {
  const t = useTranslations("cases.actions");
  const format = useFormatter();
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis);
  const [taxRate, setTaxRate] = useState(initial.tax_rate);
  const [lines, setLines] = useState<QuoteLine[]>(
    initial.lines.length ? initial.lines : [emptyLine()],
  );

  const totals = computeTotals(lines, taxRate);
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const route = approvalRoute(totals.total_ttc, threshold);
  const setLine = (i: number, patch: Partial<QuoteLine>) =>
    setLines((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, summary, diagnosis, tax_rate: taxRate, lines });
      }}
    >
      <Input
        label={t("devisLabel")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <label className={styles.label}>
        {t("summary")}
        <textarea
          className={styles.textarea}
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      <label className={styles.label}>
        {t("diagnosis")}
        <textarea
          className={styles.textarea}
          rows={3}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
      </label>

      <fieldset className={styles.lines}>
        <legend className={styles.label}>{t("lines")}</legend>
        {lines.map((line, i) => (
          <div className={styles.line} key={i}>
            <Input
              label={t("lineLabel")}
              value={line.label}
              onChange={(e) => setLine(i, { label: e.target.value })}
              required
            />
            <Input
              label={t("quantity")}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={String(line.quantity)}
              onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
            />
            <Input
              label={t("unitPrice")}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={String(line.unit_price_ht)}
              onChange={(e) => setLine(i, { unit_price_ht: Number(e.target.value) })}
            />
            <p className={styles.lineTotal}>
              <span>{t("lineTotal")}</span>
              {eur(Math.round(line.quantity * line.unit_price_ht * 100) / 100)}
            </p>
            <button
              type="button"
              className={styles.remove}
              aria-label={`${t("removeLine")} ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((all) => all.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLines((all) => [...all, emptyLine()])}
        >
          <Plus aria-hidden="true" />
          {t("addLine")}
        </Button>
      </fieldset>

      <div className={styles.footer}>
        <div className={styles.tax}>
          <Select
            label={t("taxRate")}
            value={String(taxRate)}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            options={VAT_RATES.map((r) => ({
              value: String(r),
              label: `${String(r).replace(".", ",")} %`,
            }))}
          />
        </div>
        <dl className={styles.totals}>
          <div>
            <dt>{t("subtotal")}</dt>
            <dd>{eur(totals.subtotal_ht)}</dd>
          </div>
          <div>
            <dt>{t("tax")}</dt>
            <dd>{eur(totals.tax_amount)}</dd>
          </div>
          <div className={styles.grand}>
            <dt>{t("total")}</dt>
            <dd data-testid="devis-total">{eur(totals.total_ttc)}</dd>
          </div>
        </dl>
      </div>

      <p className={styles.route}>
        {t(route === "director" ? "routeDirector" : "routeManager", {
          threshold: format.number(threshold, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }),
        })}
      </p>
      <div className="form-actions">
        <Button type="submit" loading={submitting}>
          {t("submitDevis")}
        </Button>
      </div>
    </form>
  );
}
