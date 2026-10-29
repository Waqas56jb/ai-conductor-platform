"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImagePlus, LocateFixed, X } from "lucide-react";
import { reportIncident, type ReportState } from "@/app/app/cases/actions";
import { addressFromPosition } from "@/app/app/geo-actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Card, Input, Select } from "@/components/ui";
import { resizeImage } from "@/lib/images";
import styles from "./ReportForm.module.css";

const MAX_PHOTOS = 6;
type Picked = { file: File; url: string };

export function ReportForm({ staff }: { staff: boolean }) {
  const t = useTranslations("cases.report");
  const tv = useTranslations("validation");
  const tu = useTranslations("urgency");
  const tc = useTranslations("channel");
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Photos live in state (with previews) and are resized right before sending.
  const [state, action, pending] = useActionState(
    async (prev: ReportState, formData: FormData) => {
      formData.delete("photos");
      for (const p of photos) formData.append("photos", await resizeImage(p.file));
      return reportIncident(prev, formData);
    },
    { status: "idle" } satisfies ReportState,
  );

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  useEffect(() => {
    if (state.values) {
      setAddress(state.values.address ?? "");
      setCity(state.values.city ?? "");
    }
  }, [state.values]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((all) => [...all, ...next].slice(0, MAX_PHOTOS));
  }

  function locate() {
    setLocateError(false);
    if (!navigator.geolocation) return setLocateError(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await addressFromPosition(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (!place) return setLocateError(true);
        setAddress(place.label);
        setCity(place.city);
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
      { timeout: 10000 },
    );
  }

  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;
  const v = state.values;

  return (
    <form action={action} className="stack" noValidate>
      {state.message ? <FormAlert messageKey={state.message} tone="error" /> : null}

      <Card title={t("photos")} description={t("photosHint")}>
        <div className={styles.photoActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => cameraRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            <Camera aria-hidden="true" />
            {t("takePhoto")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => galleryRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            <ImagePlus aria-hidden="true" />
            {t("addPhotos")}
          </Button>
          <input
            ref={cameraRef}
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            data-testid="photo-input"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {photos.length ? (
          <ul className={styles.previews}>
            {photos.map((p, i) => (
              <li key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${t("photos")} ${i + 1}`} />
                <button
                  type="button"
                  aria-label={t("removePhoto")}
                  onClick={() => setPhotos((all) => all.filter((x) => x.url !== p.url))}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {err("photos") ? (
          <p className={styles.error} role="alert">
            {err("photos")}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="form-grid">
          <Input
            label={t("titleField")}
            name="title"
            placeholder={t("titlePlaceholder")}
            required
            defaultValue={v?.title}
            error={err("title")}
          />
          <div className="form-grid">
            <label className={styles.label} htmlFor="report-description">
              {t("description")}
            </label>
            <textarea
              id="report-description"
              name="description"
              className={styles.textarea}
              rows={4}
              placeholder={t("descriptionPlaceholder")}
              defaultValue={v?.description}
            />
          </div>
          <div className="form-grid form-grid--2">
            <Input
              label={t("address")}
              name="address"
              autoComplete="street-address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={err("address")}
            />
            <Input
              label={t("city")}
              name="city"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={err("city")}
            />
          </div>
          <div className={styles.locate}>
            <Button type="button" variant="ghost" size="sm" onClick={locate} loading={locating}>
              <LocateFixed aria-hidden="true" />
              {locating ? t("locating") : t("useLocation")}
            </Button>
            {locateError ? <span className={styles.error}>{t("locationFailed")}</span> : null}
          </div>
          <div className="form-grid form-grid--2">
            <Input label={t("unit")} name="unit" defaultValue={v?.unit} error={err("unit")} />
            <Select
              label={t("urgency")}
              name="urgency"
              defaultValue={v?.urgency ?? "medium"}
              options={(["low", "medium", "high"] as const).map((u) => ({
                value: u,
                label: tu(u),
              }))}
            />
          </div>
          {staff ? (
            <div className="form-grid form-grid--2">
              <Select
                label={t("channel")}
                name="channel"
                defaultValue={v?.channel ?? "phone"}
                options={(["phone", "email", "whatsapp"] as const).map((c) => ({
                  value: c,
                  label: tc(c),
                }))}
              />
              <Input
                label={t("complainant")}
                name="complainant"
                defaultValue={v?.complainant}
                error={err("complainant")}
              />
            </div>
          ) : null}
        </div>
      </Card>

      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
