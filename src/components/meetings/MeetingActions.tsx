"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ListChecks, Trash2 } from "lucide-react";
import { createTasksFromMeeting, deleteMeeting } from "@/app/app/meetings/actions";
import { Badge, Button, EmptyState, Modal, useToast } from "@/components/ui";
import type { MeetingAction } from "@/lib/db/types";
import styles from "./meetings.module.css";

type Item = MeetingAction & { created: boolean };

/** Pick the action items to turn into tasks (and who does them); confirmed first. */
export function MeetingActions({
  meetingId,
  actions,
  members,
  meId,
  canDelete,
}: {
  meetingId: string;
  actions: Item[];
  members: { id: string; name: string }[];
  meId: string;
  canDelete: boolean;
}) {
  const t = useTranslations("meetings");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Default assignee: the member whose name the summary gave as owner, else me.
  const guess = (owner: string | null) =>
    members.find((m) => owner && m.name.toLowerCase().includes(owner.toLowerCase().split(" ")[0]))
      ?.id ?? meId;
  const [picks, setPicks] = useState(() =>
    actions.map((a) => ({ on: !a.created, assigneeId: guess(a.owner) })),
  );
  const [confirm, setConfirm] = useState<"tasks" | "delete" | null>(null);
  const chosen = picks.flatMap((p, index) =>
    p.on && !actions[index].created ? [{ index, assigneeId: p.assigneeId }] : [],
  );

  return (
    <div className="stack">
      {actions.length ? (
        <ul className={styles.actions}>
          {actions.map((a, i) => (
            <li key={i} data-testid="meeting-action">
              <label className={styles.pick}>
                <input
                  type="checkbox"
                  checked={picks[i].on && !a.created}
                  disabled={a.created}
                  onChange={(e) =>
                    setPicks((p) => p.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))
                  }
                />
                <span>
                  <strong>{a.title}</strong>
                  <span className={styles.meta}>
                    {a.owner ? t("owner", { owner: a.owner }) : t("noOwner")}
                    {a.due ? ` · ${t("due", { date: a.due })}` : ""}
                  </span>
                </span>
              </label>
              {a.created ? (
                <Badge tone="success">{t("taskCreated")}</Badge>
              ) : (
                <label className={styles.assignee}>
                  <span className="sr-only">{t("assigneeFor", { title: a.title })}</span>
                  <select
                    value={picks[i].assigneeId}
                    onChange={(e) =>
                      setPicks((p) =>
                        p.map((x, j) => (j === i ? { ...x, assigneeId: e.target.value } : x)),
                      )
                    }
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("noActions")} />
      )}
      <div className={styles.footer}>
        {actions.length ? (
          <Button onClick={() => setConfirm("tasks")} disabled={!chosen.length}>
            <ListChecks aria-hidden="true" />
            {t("createTasks", { count: chosen.length })}
          </Button>
        ) : null}
        {canDelete ? (
          <Button variant="ghost" onClick={() => setConfirm("delete")}>
            <Trash2 aria-hidden="true" />
            {t("delete")}
          </Button>
        ) : null}
      </div>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "delete" ? t("delete") : t("createTasks", { count: chosen.length })}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant={confirm === "delete" ? "danger" : "primary"}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  if (confirm === "delete") {
                    const r = await deleteMeeting(meetingId);
                    setConfirm(null);
                    if (r.ok) router.push("/app/meetings");
                    else toast(tAll(r.error), "error");
                    return;
                  }
                  const r = await createTasksFromMeeting(meetingId, chosen);
                  setConfirm(null);
                  if (r.ok) toast(t("tasksCreated", { count: r.created }));
                  else toast(tAll(r.error), "error");
                  router.refresh();
                })
              }
            >
              {tAll("cases.actions.confirm")}
            </Button>
          </>
        }
      >
        {confirm === "delete"
          ? t("deleteConfirm")
          : t("createTasksConfirm", { count: chosen.length })}
      </Modal>
    </div>
  );
}
