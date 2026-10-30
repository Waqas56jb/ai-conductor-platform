"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mic, Square, Sparkles } from "lucide-react";
import { createMeeting } from "@/app/app/meetings/actions";
import { Button, Input, useToast } from "@/components/ui";
import styles from "./meetings.module.css";

/** Local value for a datetime-local field (now, to the minute). */
function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Notes typed in, or a recording (made here or uploaded): summarised by the assistant. */
export function NewMeetingForm() {
  const t = useTranslations("meetings");
  const tAll = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"notes" | "audio">("notes");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [heldAt, setHeldAt] = useState(nowLocal);
  const [notes, setNotes] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const recorder = useRef<MediaRecorder | null>(null);

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setAudio(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        setRecording(false);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast(tAll("assistant.voice.noMic"), "error");
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData();
        data.set("title", title);
        data.set("participants", participants);
        data.set("heldAt", heldAt ? new Date(heldAt).toISOString() : "");
        data.set("notes", mode === "notes" ? notes : "");
        if (mode === "audio" && audio) data.set("audio", audio, "meeting.webm");
        startTransition(async () => {
          const r = await createMeeting(data);
          if (r.ok) {
            toast(t("created"));
            router.push(`/app/meetings/${r.id}`);
          } else {
            setErrors(r.fieldErrors ?? {});
            toast(tAll(r.error), "error");
          }
        });
      }}
    >
      <Input
        label={t("titleLabel")}
        value={title}
        maxLength={200}
        required
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title ? tAll(`validation.${errors.title}`) : undefined}
      />
      <Input
        label={t("participants")}
        value={participants}
        maxLength={1000}
        optionalLabel={tAll("common.optional")}
        onChange={(e) => setParticipants(e.target.value)}
      />
      <Input
        label={t("heldAt")}
        type="datetime-local"
        value={heldAt}
        required
        onChange={(e) => setHeldAt(e.target.value)}
      />

      <div className={styles.modes} role="radiogroup" aria-label={t("input")}>
        {(["notes", "audio"] as const).map((m) => (
          <label key={m} className={styles.mode}>
            <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
            {t(`source.${m}`)}
          </label>
        ))}
      </div>

      {mode === "notes" ? (
        <div className={styles.notesField}>
          <label htmlFor="meeting-notes">{t("notes")}</label>
          <textarea
            id="meeting-notes"
            rows={8}
            maxLength={100000}
            value={notes}
            placeholder={t("notesPlaceholder")}
            onChange={(e) => setNotes(e.target.value)}
          />
          {errors.notes ? <p className={styles.error}>{t("tooShort")}</p> : null}
        </div>
      ) : (
        <div className={styles.audio}>
          <Button
            type="button"
            variant={recording ? "danger" : "secondary"}
            onClick={toggleRecording}
          >
            {recording ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {recording ? t("stopRecording") : t("record")}
          </Button>
          <label className={styles.upload}>
            {t("upload")}
            <input
              type="file"
              accept="audio/*"
              data-testid="meeting-audio"
              onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            />
          </label>
          {audio ? (
            <p className={styles.ready}>
              {t("audioReady", { size: Math.round(audio.size / 1024) })}
            </p>
          ) : null}
          {errors.audio ? <p className={styles.error}>{t("audioInvalid")}</p> : null}
        </div>
      )}
      <div>
        <Button
          type="submit"
          loading={pending}
          disabled={recording || (mode === "audio" && !audio)}
        >
          <Sparkles aria-hidden="true" />
          {pending ? t("working") : t("summarize")}
        </Button>
      </div>
    </form>
  );
}
