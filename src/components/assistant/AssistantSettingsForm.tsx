"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check } from "lucide-react";
import {
  setCompanyTheme,
  updateAssistantSettings,
  type AssistantSettingsPatch,
} from "@/app/app/settings/assistant/actions";
import { Button, Card, Input, Select, useToast } from "@/components/ui";
import { THEME_PRESETS, type AssistantSettings } from "@/lib/assistant/defaults";
import { ASSISTANT_TONES, ASSISTANT_VOICES, AVATAR_TYPES, THEME_COLORS } from "@/lib/db/types";
import { AssistantAvatar } from "./AssistantAvatar";
import { useAssistant } from "./AssistantProvider";
import styles from "./AssistantSettings.module.css";

/**
 * Every control saves on change and shows at once in the header avatar, the
 * panel and the theme; a failed save puts the stored value back.
 */
export function AssistantSettingsForm({ canSetCompanyTheme }: { canSetCompanyTheme: boolean }) {
  const t = useTranslations("assistantSettings");
  const tAll = useTranslations();
  const toast = useToast();
  const { settings, preview, companyTheme, previewCompanyTheme } = useAssistant();
  const [name, setName] = useState(settings.display_name);
  // The header already shows the name being typed: compare with what is stored.
  const savedName = useRef(settings.display_name);
  const [, startTransition] = useTransition();

  function save(patch: AssistantSettingsPatch, previous?: Partial<AssistantSettings>) {
    const before: Partial<AssistantSettings> = { ...previous };
    for (const key of Object.keys(patch) as (keyof AssistantSettings)[])
      if (!(key in before)) (before as Record<string, unknown>)[key] = settings[key];
    preview(patch as Partial<AssistantSettings>);
    startTransition(async () => {
      const r = await updateAssistantSettings(patch);
      if (r.ok) toast(t("saved"));
      else {
        preview(before);
        toast(tAll(r.error), "error");
      }
    });
  }

  function saveName() {
    const value = name.trim();
    const stored = savedName.current;
    if (!value || value.length > 40) {
      setName(stored);
      preview({ display_name: stored });
      return;
    }
    if (value === stored) return;
    savedName.current = value;
    save({ display_name: value }, { display_name: stored });
  }

  function applyToCompany(color: (typeof THEME_COLORS)[number]) {
    const before = companyTheme;
    previewCompanyTheme(color);
    startTransition(async () => {
      const r = await setCompanyTheme(color);
      if (r.ok) toast(t("theme.companySaved"));
      else {
        previewCompanyTheme(before);
        toast(tAll(r.error), "error");
      }
    });
  }

  const effective = settings.theme_color ?? companyTheme;

  return (
    <>
      <Card title={t("identity.title")} description={t("identity.description")}>
        <div className={styles.grid}>
          <Input
            label={t("name")}
            hint={t("nameHint")}
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) preview({ display_name: e.target.value.trim() });
            }}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveName();
              }
            }}
          />
          <Select
            label={t("voice.label")}
            value={settings.voice}
            options={ASSISTANT_VOICES.map((v) => ({ value: v, label: t(`voice.${v}`) }))}
            onChange={(e) => save({ voice: e.target.value as AssistantSettings["voice"] })}
            aria-describedby="voice-hint"
          />
          <Select
            label={t("language")}
            value={settings.language}
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
            onChange={(e) => save({ language: e.target.value as "fr" | "en" })}
          />
        </div>
        <p id="voice-hint" className={styles.hint}>
          {t("voice.hint")}
        </p>

        <fieldset className={styles.fieldset}>
          <legend>{t("avatar.title")}</legend>
          <div className={styles.choices}>
            {AVATAR_TYPES.map((type) => (
              <label key={type} className={styles.choice}>
                <input
                  type="radio"
                  name="avatar_type"
                  value={type}
                  checked={settings.avatar_type === type}
                  onChange={() => save({ avatar_type: type })}
                />
                <AssistantAvatar type={type} name={settings.display_name} size={56} />
                <span>{t(`avatar.${type}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card title={t("tone.title")} description={t("tone.description")}>
        <fieldset className={styles.fieldset}>
          <legend className="sr-only">{t("tone.title")}</legend>
          <div className={styles.tones}>
            {ASSISTANT_TONES.map((tone) => (
              <label key={tone} className={styles.tone}>
                <input
                  type="radio"
                  name="tone"
                  value={tone}
                  checked={settings.tone === tone}
                  onChange={() => save({ tone })}
                />
                <strong>{t(`tone.${tone}`)}</strong>
                <span className={styles.sample}>« {t(`tone.samples.${tone}`)} »</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            role="switch"
            checked={settings.context_aware_tone}
            onChange={(e) => save({ context_aware_tone: e.target.checked })}
          />
          <span className={styles.switch} aria-hidden="true" />
          <span>
            <strong>{t("contextAware.label")}</strong>
            <span className={styles.hint}>{t("contextAware.hint")}</span>
          </span>
        </label>
      </Card>

      <Card title={t("theme.title")} description={t("theme.description")}>
        <fieldset className={styles.fieldset}>
          <legend className="sr-only">{t("theme.title")}</legend>
          <div className={styles.swatches}>
            {THEME_COLORS.map((color) => {
              const { accent, accent2 } = THEME_PRESETS[color];
              return (
                <label key={color} className={styles.swatch}>
                  <input
                    type="radio"
                    name="theme_color"
                    value={color}
                    checked={settings.theme_color === color}
                    onChange={() => save({ theme_color: color })}
                  />
                  <span
                    className={styles.chip}
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
                    aria-hidden="true"
                  >
                    {effective === color ? <Check /> : null}
                  </span>
                  <span>{t(`theme.colors.${color}`)}</span>
                </label>
              );
            })}
            <label className={styles.swatch}>
              <input
                type="radio"
                name="theme_color"
                value=""
                checked={settings.theme_color === null}
                onChange={() => save({ theme_color: null })}
              />
              <span className={`${styles.chip} ${styles.companyChip}`} aria-hidden="true">
                <Building2 />
              </span>
              <span>{t("theme.followCompany", { color: t(`theme.colors.${companyTheme}`) })}</span>
            </label>
          </div>
        </fieldset>
        {canSetCompanyTheme ? (
          <div className={styles.company}>
            <p className={styles.hint}>{t("theme.companyHint")}</p>
            <Button
              variant="secondary"
              size="sm"
              disabled={companyTheme === effective}
              onClick={() => applyToCompany(effective)}
            >
              <Building2 aria-hidden="true" />
              {t("theme.company")}
            </Button>
          </div>
        ) : null}
      </Card>
    </>
  );
}
