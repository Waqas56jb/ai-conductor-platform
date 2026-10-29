"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateAgentProfile } from "@/app/app/assistant/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Input, Select, useToast } from "@/components/ui";
import type { AgentProfile } from "@/lib/ai/assistant/run";
import { initialFormState } from "@/lib/forms";
import styles from "@/components/cases/CaseActions.module.css";

export function AgentProfileForm({ agent }: { agent: AgentProfile }) {
  const t = useTranslations("assistant.agent");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateAgentProfile, initialFormState);
  const v = state.values;
  const err = (f: string) => (state.fieldErrors?.[f] ? tv(state.fieldErrors[f]) : undefined);

  useEffect(() => {
    if (state.status === "success" && state.message) toast(tAll(state.message));
  }, [state, toast, tAll]);

  return (
    <form action={action} className="form-grid" noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      <Input
        label={t("name")}
        name="assistantName"
        maxLength={40}
        defaultValue={v?.assistantName ?? agent.assistant_name}
        error={err("assistantName")}
      />
      <div className="form-grid form-grid--2">
        <Select
          label={t("tone")}
          name="tone"
          defaultValue={v?.tone ?? agent.tone}
          options={(["professional", "friendly", "concise"] as const).map((k) => ({
            value: k,
            label: t(`tones.${k}`),
          }))}
        />
        <Select
          label={t("language")}
          name="language"
          defaultValue={v?.language ?? agent.language}
          options={(["fr", "en"] as const).map((k) => ({ value: k, label: t(`languages.${k}`) }))}
        />
      </div>
      <label className={styles.label}>
        {t("instructions")}
        <textarea
          name="instructions"
          rows={3}
          maxLength={2000}
          className={styles.textarea}
          placeholder={t("instructionsHint")}
          defaultValue={v?.instructions ?? agent.instructions}
        />
        {err("instructions") ? (
          <span role="alert" style={{ color: "var(--red)" }}>
            {err("instructions")}
          </span>
        ) : null}
      </label>
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {tAll("common.save")}
        </Button>
      </div>
    </form>
  );
}
