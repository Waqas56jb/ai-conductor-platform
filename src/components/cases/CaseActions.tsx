"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Sparkles, Upload } from "lucide-react";
import {
  addSitePhotos,
  assignTechnicians,
  cancelCase,
  completeIntervention,
  decideDevis,
  generateDevisDraft,
  scheduleIntervention,
  startIntervention,
  submitDevis,
  triageCase,
  type ActionResult,
} from "@/app/app/cases/actions";
import { Badge, Button, Card, Input, Modal, Select, useToast } from "@/components/ui";
import type { TechnicianCard } from "@/lib/cases/queries";
import type { Urgency } from "@/lib/db/types";
import { resizeImage } from "@/lib/images";
import type { DevisInput } from "@/lib/workflows/devis";
import type { IncidentAction } from "@/lib/workflows/incident";
import { DevisEditor } from "./DevisEditor";
import { QuoteDecision } from "./QuoteDecision";
import { TechnicianMapLazy } from "./TechnicianMapLazy";
import styles from "./CaseActions.module.css";

type Props = {
  incidentId: string;
  actions: IncidentAction[];
  urgency: Urgency | null;
  threshold: number;
  incidentPoint: { lat: number; lng: number } | null;
  technicians: TechnicianCard[];
  scheduledAt: string | null;
};

type Confirm = {
  title: string;
  text: string;
  run: () => Promise<ActionResult>;
  danger?: boolean;
} | null;

const localInput = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  if (!iso) d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function CaseActions(props: Props) {
  const { incidentId, actions } = props;
  const t = useTranslations("cases.actions");
  const tAll = useTranslations();
  const tu = useTranslations("urgency");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [urgency, setUrgency] = useState<Urgency>(props.urgency ?? "medium");
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<DevisInput | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [when, setWhen] = useState(localInput(props.scheduledAt));
  const [instructions, setInstructions] = useState("");

  const can = (a: IncidentAction) => actions.includes(a);

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast(t("done"));
        after?.();
      } else toast(tAll(r.error), "error");
    });
  }

  async function aiDraft() {
    setDrafting(true);
    const r = await generateDevisDraft(incidentId, notes);
    setDrafting(false);
    if (!r.ok) return toast(tAll(r.error), "error");
    const tax = [20, 10, 5.5, 0].includes(r.draft.tax_rate) ? r.draft.tax_rate : 20;
    setDraft({ ...r.draft, tax_rate: tax });
    setDraftVersion((v) => v + 1);
    toast(t("aiDone"));
  }

  if (!actions.length) {
    return (
      <Card title={tAll("cases.detail.actions")}>
        <p className={styles.muted}>{t("noAction")}</p>
      </Card>
    );
  }

  const point = props.incidentPoint;

  return (
    <div className={styles.stack}>
      {can("triage") ? (
        <Card title={t("triageTitle")}>
          <div className={styles.inline}>
            <Select
              label={tAll("cases.report.urgency")}
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              options={(["low", "medium", "high"] as const).map((u) => ({
                value: u,
                label: tu(u),
              }))}
            />
            <Button onClick={() => run(() => triageCase(incidentId, urgency))} loading={pending}>
              {t("triage")}
            </Button>
          </div>
        </Card>
      ) : null}

      {can("assign") ? (
        <Card title={t("assignTitle")} description={t("assignSub")}>
          <div className={styles.stack}>
            <TechnicianMapLazy
              label={tAll("technicians.map")}
              points={[
                ...(point
                  ? [
                      {
                        id: incidentId,
                        lat: point.lat,
                        lng: point.lng,
                        label: incidentId,
                        kind: "incident" as const,
                      },
                    ]
                  : []),
                ...props.technicians
                  .filter((tech) => tech.lat !== null && tech.lng !== null)
                  .map((tech) => ({
                    id: tech.id,
                    lat: tech.lat as number,
                    lng: tech.lng as number,
                    label: tech.display_name,
                    kind: "technician" as const,
                    selected: picked.includes(tech.id),
                  })),
              ]}
            />
            <ul className={styles.techs}>
              {props.technicians.map((tech) => {
                const checked = picked.includes(tech.id);
                return (
                  <li key={tech.id}>
                    <label
                      className={`${styles.tech} ${checked ? styles.techOn : ""} ${!tech.available ? styles.techOff : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!tech.available}
                        onChange={() =>
                          setPicked((all) =>
                            checked ? all.filter((x) => x !== tech.id) : [...all, tech.id],
                          )
                        }
                      />
                      <span>
                        <strong>{tech.display_name}</strong>
                        <small>
                          {[tech.specialty, tech.city].filter(Boolean).join(" · ") || "—"}
                        </small>
                      </span>
                      {tech.available ? (
                        tech.rating ? (
                          <Badge tone="neutral">★ {Number(tech.rating).toFixed(1)}</Badge>
                        ) : null
                      ) : (
                        <Badge tone="warning">{t("unavailable")}</Badge>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="form-actions">
              <Button
                disabled={!picked.length}
                loading={pending}
                onClick={() => run(() => assignTechnicians(incidentId, picked))}
              >
                {t("assign")} {picked.length ? `(${picked.length})` : ""}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {can("submit_devis") ? (
        <Card title={t("siteTitle")}>
          <div className={styles.stack}>
            <div className={styles.inline}>
              <label className={styles.fileLabel}>
                {t("sitePhotos")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  data-testid="site-photo-input"
                  onChange={(e) => setPhotos([...(e.target.files ?? [])])}
                />
              </label>
              <Button
                variant="secondary"
                disabled={!photos.length}
                loading={pending}
                onClick={() =>
                  run(
                    async () => {
                      const fd = new FormData();
                      for (const f of photos) fd.append("photos", await resizeImage(f));
                      return addSitePhotos(incidentId, fd);
                    },
                    () => setPhotos([]),
                  )
                }
              >
                <Upload aria-hidden="true" />
                {t("uploadPhotos")}
              </Button>
            </div>
            <label className={styles.label}>
              {t("notes")}
              <textarea
                className={styles.textarea}
                rows={4}
                value={notes}
                placeholder={t("notesPlaceholder")}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <Button
                variant="secondary"
                onClick={aiDraft}
                loading={drafting}
                disabled={notes.trim().length < 10}
              >
                <Sparkles aria-hidden="true" />
                {drafting ? t("aiDrafting") : t("aiDraft")}
              </Button>
            </div>
            <h3 className={styles.subTitle}>{t("devisTitle")}</h3>
            <DevisEditor
              // Re-mount when a new AI draft arrives so the editor takes its values.
              key={draftVersion}
              initial={
                draft ?? { title: "", summary: "", diagnosis: notes, tax_rate: 20, lines: [] }
              }
              threshold={props.threshold}
              submitting={pending}
              onSubmit={(devis) => run(() => submitDevis(incidentId, devis))}
            />
          </div>
        </Card>
      ) : null}

      {can("approve_devis") ? (
        <Card title={t("approvalTitle")}>
          <div className={styles.inline}>
            <Button loading={pending} onClick={() => run(() => decideDevis(incidentId, true))}>
              <Check aria-hidden="true" />
              {t("approve")}
            </Button>
            <Button
              variant="secondary"
              loading={pending}
              onClick={() => run(() => decideDevis(incidentId, false))}
            >
              {t("reject")}
            </Button>
          </div>
        </Card>
      ) : null}

      {can("client_accept") ? (
        <Card title={t("clientTitle")}>
          <QuoteDecision incidentId={incidentId} />
        </Card>
      ) : null}

      {can("schedule") ? (
        <Card title={t("scheduleTitle")}>
          <div className="form-grid">
            <Input
              label={t("scheduleAt")}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <Input
              label={t("scheduleNotes")}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="form-actions">
              <Button
                loading={pending}
                onClick={() =>
                  run(() =>
                    scheduleIntervention(incidentId, new Date(when).toISOString(), instructions),
                  )
                }
              >
                {props.scheduledAt ? t("reschedule") : t("schedule")}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {can("start") || can("complete") ? (
        <Card title={tAll("cases.intervention.title")}>
          <div className={styles.inline}>
            {can("start") ? (
              <Button loading={pending} onClick={() => run(() => startIntervention(incidentId))}>
                {t("start")}
              </Button>
            ) : null}
            {can("complete") ? (
              <Button
                onClick={() =>
                  setConfirm({
                    title: t("complete"),
                    text: t("completeConfirm"),
                    run: () => completeIntervention(incidentId),
                  })
                }
              >
                {t("complete")}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {can("cancel") ? (
        <div className={styles.cancel}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirm({
                title: t("cancel"),
                text: t("cancelConfirm"),
                run: () => cancelCase(incidentId),
                danger: true,
              })
            }
          >
            {t("cancel")}
          </Button>
        </div>
      ) : null}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        closeLabel={tAll("common.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tAll("common.cancel")}
            </Button>
            <Button
              variant={confirm?.danger ? "danger" : "primary"}
              loading={pending}
              onClick={() => {
                const c = confirm;
                if (c) run(c.run, () => setConfirm(null));
              }}
            >
              {t("confirm")}
            </Button>
          </>
        }
      >
        {confirm?.text}
      </Modal>
    </div>
  );
}
