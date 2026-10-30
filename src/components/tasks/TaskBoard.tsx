"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ListPlus, Trash2 } from "lucide-react";
import { createTask, deleteTask, setTaskStatus } from "@/app/app/tasks/actions";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  buttonClass,
  useToast,
  type BadgeTone,
} from "@/components/ui";
import type { TeamTaskRow } from "@/lib/db/types";
import styles from "./tasks.module.css";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: TeamTaskRow["status"];
  priority: TeamTaskRow["priority"];
  dueAt: string | null;
  assignee: string | null;
  incidentId: string | null;
  source: TeamTaskRow["source"];
  canDelete: boolean;
};

const COLUMNS = ["todo", "in_progress", "done"] as const;
const PRIORITY_TONE: Record<TaskItem["priority"], BadgeTone> = {
  low: "neutral",
  normal: "info",
  high: "danger",
};

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function TaskBoard({
  tasks,
  members,
  meId,
  showAll,
  now,
}: {
  tasks: TaskItem[];
  members: { id: string; name: string }[];
  meId: string;
  showAll: boolean;
  /** Server time, so "late" renders the same on server and client. */
  now: string;
}) {
  const t = useTranslations("tasks");
  const tAll = useTranslations();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    due: "",
    assigneeId: meId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = (action: () => Promise<Result>, done: string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        toast(done);
        after?.();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast(tAll(r.error), "error");
      }
      router.refresh();
    });

  return (
    <div className="stack">
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={t("filter")}>
          <Link
            href="/app/tasks"
            aria-current={!showAll ? "page" : undefined}
            className={buttonClass({ variant: showAll ? "ghost" : "secondary", size: "sm" })}
          >
            {t("mine")}
          </Link>
          <Link
            href="/app/tasks?all=1"
            aria-current={showAll ? "page" : undefined}
            className={buttonClass({ variant: showAll ? "secondary" : "ghost", size: "sm" })}
          >
            {t("everyone")}
          </Link>
        </div>
        <Button onClick={() => setCreating(true)}>
          <ListPlus aria-hidden="true" />
          {t("new")}
        </Button>
      </div>

      <div className={styles.board}>
        {COLUMNS.map((column) => {
          const items = tasks.filter((x) => x.status === column);
          return (
            <Card
              key={column}
              title={`${t(`status.${column}`)} (${items.length})`}
              data-testid={`column-${column}`}
            >
              {items.length ? (
                <ul className={styles.list}>
                  {items.map((task) => {
                    const late =
                      task.dueAt && task.status !== "done" && new Date(task.dueAt) < new Date(now);
                    return (
                      <li key={task.id} data-testid="task">
                        <div className={styles.taskHead}>
                          <strong>{task.title}</strong>
                          <Badge tone={PRIORITY_TONE[task.priority]}>
                            {t(`priority.${task.priority}`)}
                          </Badge>
                        </div>
                        {task.description ? (
                          <p className={styles.description}>{task.description}</p>
                        ) : null}
                        <p className={styles.meta}>
                          {task.assignee ?? t("unassigned")}
                          {task.dueAt ? (
                            <span className={late ? styles.late : ""}>
                              {" · "}
                              {format.dateTime(new Date(task.dueAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          ) : null}
                          {task.source !== "manual" ? ` · ${t(`source.${task.source}`)}` : ""}
                        </p>
                        <div className={styles.taskActions}>
                          {task.incidentId ? (
                            <Link
                              href={`/app/cases/${task.incidentId}`}
                              className={buttonClass({ variant: "ghost", size: "sm" })}
                            >
                              {t("openCase")}
                            </Link>
                          ) : null}
                          <label className={styles.statusSelect}>
                            <span className="sr-only">{t("statusOf", { title: task.title })}</span>
                            <select
                              value={task.status}
                              disabled={pending}
                              onChange={(e) =>
                                run(() => setTaskStatus(task.id, e.target.value), t("updated"))
                              }
                            >
                              {COLUMNS.map((c) => (
                                <option key={c} value={c}>
                                  {t(`status.${c}`)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {task.canDelete ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemoving(task)}
                              aria-label={`${t("delete")} : ${task.title}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title={t(`empty.${column}`)} />
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t("new")}
        closeLabel={tAll("common.close")}
      >
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                createTask({
                  title: form.title,
                  description: form.description,
                  priority: form.priority as TaskItem["priority"],
                  dueAt: form.due ? new Date(form.due).toISOString() : "",
                  assigneeId: form.assigneeId,
                }),
              t("created"),
              () => {
                setCreating(false);
                setErrors({});
                setForm((f) => ({ ...f, title: "", description: "", due: "" }));
              },
            );
          }}
        >
          <Input
            label={t("titleLabel")}
            value={form.title}
            maxLength={200}
            required
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={errors.title ? tAll(`validation.${errors.title}`) : undefined}
          />
          <Input
            label={t("description")}
            value={form.description}
            maxLength={2000}
            optionalLabel={tAll("common.optional")}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label={t("assignee")}
            value={form.assigneeId}
            options={[
              { value: "", label: t("unassigned") },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
            onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          />
          <Select
            label={t("priorityLabel")}
            value={form.priority}
            options={(["low", "normal", "high"] as const).map((p) => ({
              value: p,
              label: t(`priority.${p}`),
            }))}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
          <Input
            label={t("due")}
            type="datetime-local"
            value={form.due}
            optionalLabel={tAll("common.optional")}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
          <div>
            <Button type="submit" loading={pending} disabled={!form.title.trim()}>
              {t("create")}
            </Button>
          </div>
        </form>
      </Modal>

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
                  () => deleteTask(removing.id),
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
        {removing ? t("deleteConfirm", { title: removing.title }) : null}
      </Modal>
    </div>
  );
}
