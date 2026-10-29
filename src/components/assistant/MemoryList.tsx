"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addMemory,
  approveMemory,
  clearMemories,
  deleteMemory,
  updateMemory,
} from "@/app/app/settings/assistant/actions";
import { Badge, Button, EmptyState, Modal, Select, useToast } from "@/components/ui";
import { MEMORY_KINDS, type AssistantMemoryRow, type MemoryKind } from "@/lib/db/types";
import styles from "./AssistantSettings.module.css";

type Memory = Pick<AssistantMemoryRow, "id" | "kind" | "content" | "approved" | "source">;
type Result = { ok: true } | { ok: false; error: string };

/** "Mémoire & règles": everything the assistant may remember, approved or suggested. */
export function MemoryList({ memories }: { memories: Memory[] }) {
  const t = useTranslations("assistantSettings.memory");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<MemoryKind>("rule");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [removing, setRemoving] = useState<Memory | null>(null);

  const run = (action: () => Promise<Result>, done: string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        toast(done);
        after?.();
      } else toast(tAll(r.error), "error");
      router.refresh();
    });

  return (
    <div className="stack">
      <form
        className={styles.addMemory}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim())
            run(
              () => addMemory(kind, draft),
              t("added"),
              () => setDraft(""),
            );
        }}
      >
        <Select
          label={t("kind")}
          value={kind}
          options={MEMORY_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
          onChange={(e) => setKind(e.target.value as MemoryKind)}
        />
        <div className={styles.addField}>
          <label htmlFor="memory-new">{t("new")}</label>
          <input
            id="memory-new"
            value={draft}
            maxLength={500}
            placeholder={t("placeholder")}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!draft.trim()} loading={pending && !editing}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      </form>

      {memories.length ? (
        <ul className={styles.memories}>
          {memories.map((m) => (
            <li key={m.id} className={m.approved ? "" : styles.suggested} data-testid="memory">
              <div className={styles.memoryHead}>
                <Badge
                  tone={m.kind === "rule" ? "info" : m.kind === "fact" ? "neutral" : "success"}
                >
                  {t(`kinds.${m.kind}`)}
                </Badge>
                {m.approved ? null : <Badge tone="warning">{t("pending")}</Badge>}
                {m.source === "assistant" ? (
                  <span className={styles.hint}>{t("fromAssistant")}</span>
                ) : null}
              </div>
              {editing?.id === m.id ? (
                <form
                  className={styles.editMemory}
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      () => updateMemory(m.id, editing.text),
                      t("updated"),
                      () => setEditing(null),
                    );
                  }}
                >
                  <label className="sr-only" htmlFor={`memory-${m.id}`}>
                    {t("edit")}
                  </label>
                  <input
                    id={`memory-${m.id}`}
                    value={editing.text}
                    maxLength={500}
                    autoFocus
                    onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                  />
                  <Button type="submit" size="sm" loading={pending} disabled={!editing.text.trim()}>
                    {tAll("common.save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    {tAll("common.cancel")}
                  </Button>
                </form>
              ) : (
                <p>{m.content}</p>
              )}
              <div className={styles.memoryActions}>
                {m.approved ? null : (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => approveMemory(m.id), t("approved"))}
                  >
                    <Check aria-hidden="true" />
                    {t("approve")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setEditing({ id: m.id, text: m.content })}
                  aria-label={`${t("edit")} : ${m.content}`}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setRemoving(m)}
                  aria-label={`${t("delete")} : ${m.content}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("empty")} text={t("emptyText")} />
      )}

      {memories.length ? (
        <div>
          <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 aria-hidden="true" />
            {t("clearAll")}
          </Button>
        </div>
      ) : null}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("delete")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                removing &&
                run(
                  () => deleteMemory(removing.id),
                  t("deleted"),
                  () => setRemoving(null),
                )
              }
            >
              {t("delete")}
            </Button>
          </>
        }
      >
        {removing ? t("deleteConfirm", { content: removing.content }) : null}
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t("clearAll")}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => run(clearMemories, t("cleared"), () => setConfirmClear(false))}
            >
              {t("clearConfirmButton")}
            </Button>
          </>
        }
      >
        {t("clearConfirm")}
      </Modal>
    </div>
  );
}
