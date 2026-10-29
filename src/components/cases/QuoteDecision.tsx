"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { clientDecision } from "@/app/app/cases/actions";
import { Button, Modal, useToast } from "@/components/ui";
import styles from "./CaseActions.module.css";

/** Client accept / decline of a quote (accepting asks for explicit confirmation). */
export function QuoteDecision({ incidentId }: { incidentId: string }) {
  const t = useTranslations("cases.actions");
  const tAll = useTranslations();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const decide = (accept: boolean) =>
    startTransition(async () => {
      const r = await clientDecision(incidentId, accept);
      setConfirm(false);
      if (r.ok) toast(t("done"));
      else toast(tAll(r.error), "error");
    });

  return (
    <div className={styles.inline}>
      <Button onClick={() => setConfirm(true)}>
        <Check aria-hidden="true" />
        {t("accept")}
      </Button>
      <Button variant="secondary" loading={pending} onClick={() => decide(false)}>
        {t("decline")}
      </Button>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("accept")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              {tAll("common.cancel")}
            </Button>
            <Button loading={pending} onClick={() => decide(true)}>
              {t("confirm")}
            </Button>
          </>
        }
      >
        {t("acceptConfirm")}
      </Modal>
    </div>
  );
}
