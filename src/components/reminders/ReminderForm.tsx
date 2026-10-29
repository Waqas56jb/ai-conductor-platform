"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BellPlus } from "lucide-react";
import { createReminder } from "@/app/app/reminders/actions";
import { Button, Input, Modal, Select, useToast } from "@/components/ui";
import { REMINDER_KINDS, type ReminderEntity, type ReminderKind } from "@/lib/reminders";
import styles from "./reminders.module.css";

/** Value for a datetime-local field, one hour from now (local time). */
function inOneHour(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function ReminderForm({
  entity = null,
  defaultTitle = "",
  onDone,
}: {
  entity?: ReminderEntity | null;
  defaultTitle?: string;
  onDone?: () => void;
}) {
  const t = useTranslations("reminders");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ReminderKind>("follow_up");
  const [title, setTitle] = useState(defaultTitle);
  const [dueAt, setDueAt] = useState(inOneHour);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          // The field is in the user's local time; the server gets an exact instant.
          const iso = dueAt ? new Date(dueAt).toISOString() : "";
          const r = await createReminder({ kind, title, notes, dueAt: iso }, entity);
          if (r.ok) {
            toast(t("created"));
            setTitle(defaultTitle);
            setNotes("");
            setErrors({});
            router.refresh();
            onDone?.();
          } else {
            setErrors(r.fieldErrors ?? {});
            toast(tAll(r.error), "error");
          }
        });
      }}
    >
      <Select
        label={t("kind")}
        value={kind}
        options={REMINDER_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
        onChange={(e) => setKind(e.target.value as ReminderKind)}
      />
      <Input
        label={t("titleLabel")}
        value={title}
        maxLength={200}
        required
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title ? tAll(`validation.${errors.title}`) : undefined}
      />
      <Input
        label={t("when")}
        type="datetime-local"
        value={dueAt}
        required
        onChange={(e) => setDueAt(e.target.value)}
        error={errors.dueAt ? t(`errors.${errors.dueAt === "past" ? "past" : "date"}`) : undefined}
      />
      <Input
        label={t("notes")}
        optionalLabel={tAll("common.optional")}
        value={notes}
        maxLength={1000}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div>
        <Button type="submit" loading={pending} disabled={!title.trim() || !dueAt}>
          <BellPlus aria-hidden="true" />
          {t("create")}
        </Button>
      </div>
    </form>
  );
}

/** "Rappel" on a case, a quote or an invoice: the form in a modal. */
export function ReminderButton({
  entity,
  defaultTitle,
}: {
  entity: ReminderEntity;
  defaultTitle: string;
}) {
  const t = useTranslations("reminders");
  const tAll = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <BellPlus aria-hidden="true" />
        {t("add")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("add")}
        closeLabel={tAll("common.close")}
      >
        {open ? (
          <ReminderForm entity={entity} defaultTitle={defaultTitle} onDone={() => setOpen(false)} />
        ) : null}
      </Modal>
    </>
  );
}
