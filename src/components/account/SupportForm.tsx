"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { submitFeedback } from "@/app/app/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Select, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import styles from "@/components/cases/CaseActions.module.css";

export function SupportForm() {
  const t = useTranslations("support");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitFeedback, initialFormState);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast(tAll(state.message));
      formRef.current?.reset();
    }
  }, [state, toast, tAll]);

  return (
    <form ref={formRef} action={action} className="form-grid" noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      <div className="form-grid form-grid--2">
        <Select
          label={t("topic")}
          name="topic"
          defaultValue={state.values?.topic ?? "service"}
          options={(["service", "technician", "billing", "app"] as const).map((k) => ({
            value: k,
            label: t(`topics.${k}`),
          }))}
        />
        <Select
          label={t("rating")}
          name="rating"
          defaultValue={state.values?.rating ?? "5"}
          options={[5, 4, 3, 2, 1].map((n) => ({
            value: String(n),
            label: t("ratingLabel", { rating: n }),
          }))}
        />
      </div>
      <label className={styles.label}>
        {t("message")}
        <textarea
          name="message"
          rows={4}
          className={styles.textarea}
          defaultValue={state.values?.message}
          required
        />
        {state.fieldErrors?.message ? (
          <span role="alert" style={{ color: "var(--red)" }}>
            {tv(state.fieldErrors.message)}
          </span>
        ) : null}
      </label>
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
