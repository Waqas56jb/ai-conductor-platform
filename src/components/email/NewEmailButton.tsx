"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PenSquare } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { EmailComposer } from "./EmailComposer";

export function NewEmailButton({ accountId, from }: { accountId: string; from: string }) {
  const t = useTranslations("emails");
  const tAll = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PenSquare aria-hidden="true" />
        {t("new")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("new")}
        closeLabel={tAll("common.close")}
        size="large"
      >
        {open ? (
          <EmailComposer accountId={accountId} from={from} onSent={() => setOpen(false)} />
        ) : null}
      </Modal>
    </>
  );
}
