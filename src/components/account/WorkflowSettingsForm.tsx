"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateWorkflowSettings } from "@/app/app/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Input, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import styles from "@/components/cases/CaseActions.module.css";

export type WorkflowSettings = {
  threshold: number;
  reminderDay1: number;
  reminderDay2: number;
  aiPricingNote: string;
};

export function WorkflowSettingsForm({ settings }: { settings: WorkflowSettings }) {
  const t = useTranslations("workflowSettings");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateWorkflowSettings, initialFormState);
  const v = state.values;
  const err = (f: string) => (state.fieldErrors?.[f] ? tv(state.fieldErrors[f]) : undefined);

  useEffect(() => {
    if (state.status === "success" && state.message) toast(tAll(state.message));
  }, [state, toast, tAll]);

  return (
    <form action={action} className="form-grid" noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      <Input
        label={t("threshold")}
        name="threshold"
        type="number"
        min="0"
        step="1"
        hint={t("thresholdHint")}
        defaultValue={v?.threshold ?? String(settings.threshold)}
        error={err("threshold")}
      />
      <div className="form-grid form-grid--2">
        <Input
          label={t("reminder1")}
          name="reminderDay1"
          type="number"
          min="1"
          defaultValue={v?.reminderDay1 ?? String(settings.reminderDay1)}
          error={err("reminderDay1")}
        />
        <Input
          label={t("reminder2")}
          name="reminderDay2"
          type="number"
          min="1"
          defaultValue={v?.reminderDay2 ?? String(settings.reminderDay2)}
          error={err("reminderDay2")}
        />
      </div>
      <label className={styles.label}>
        {t("pricingNote")}
        <textarea
          name="aiPricingNote"
          rows={3}
          className={styles.textarea}
          placeholder={t("pricingNoteHint")}
          defaultValue={v?.aiPricingNote ?? settings.aiPricingNote}
        />
      </label>
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {tAll("common.save")}
        </Button>
      </div>
    </form>
  );
}
