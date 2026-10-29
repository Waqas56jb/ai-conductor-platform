"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { saveTechnicianLocation, updateTechnicianProfile } from "@/app/app/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Input, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import styles from "@/components/cases/CaseActions.module.css";

export type TechnicianProfileData = {
  specialty: string;
  experienceYears: number;
  bio: string;
  available: boolean;
  place: string | null;
};

export function TechnicianProfileForm({ data }: { data: TechnicianProfileData }) {
  const t = useTranslations("techProfile");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateTechnicianProfile, initialFormState);
  const [place, setPlace] = useState(data.place);
  const [locating, startLocating] = useTransition();
  const v = state.values;
  const err = (f: string) => (state.fieldErrors?.[f] ? tv(state.fieldErrors[f]) : undefined);

  useEffect(() => {
    if (state.status === "success" && state.message) toast(tAll(state.message));
  }, [state, toast, tAll]);

  function locate() {
    if (!navigator.geolocation) return toast(t("locationFailed"), "error");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        startLocating(async () => {
          const r = await saveTechnicianLocation(pos.coords.latitude, pos.coords.longitude);
          if (r.ok && r.place) {
            setPlace(r.place);
            toast(t("locationSaved", { place: r.place }));
          } else toast(t("locationFailed"), "error");
        }),
      () => toast(t("locationFailed"), "error"),
      { timeout: 10000 },
    );
  }

  return (
    <div className="form-grid">
      <form action={action} className="form-grid" noValidate>
        {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
        <div className="form-grid form-grid--2">
          <Input
            label={t("specialty")}
            name="specialty"
            defaultValue={v?.specialty ?? data.specialty}
            error={err("specialty")}
          />
          <Input
            label={t("experience")}
            name="experienceYears"
            type="number"
            min="0"
            max="60"
            defaultValue={v?.experienceYears ?? String(data.experienceYears)}
            error={err("experienceYears")}
          />
        </div>
        <label className={styles.label}>
          {t("bio")}
          <textarea
            name="bio"
            rows={3}
            className={styles.textarea}
            defaultValue={v?.bio ?? data.bio}
          />
        </label>
        <label className={styles.tech} style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            name="available"
            defaultChecked={v ? v.available === "on" : data.available}
          />
          <span>{t("available")}</span>
        </label>
        <div className="form-actions">
          <Button type="submit" loading={pending}>
            {tAll("common.save")}
          </Button>
        </div>
      </form>

      <div className={styles.inline}>
        <div className={styles.label}>
          {t("location")}
          <span className={styles.muted}>{place ?? t("noLocation")}</span>
        </div>
        <Button variant="secondary" onClick={locate} loading={locating}>
          <LocateFixed aria-hidden="true" />
          {locating ? t("locating") : t("locate")}
        </Button>
      </div>
    </div>
  );
}
