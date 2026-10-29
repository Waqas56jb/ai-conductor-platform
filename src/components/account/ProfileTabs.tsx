"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/app/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { Button, Card, Input, Select, Tabs, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

type ProfileData = {
  displayName: string;
  phone: string;
  locale: "fr" | "en";
  email: string;
  roleLabel: string;
  companyName: string;
};

function ProfileForm({ profile }: { profile: ProfileData }) {
  const t = useTranslations("profile");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateProfile, initialFormState);
  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;
  const v = state.values;

  useEffect(() => {
    if (state.status === "success" && state.message) toast(tAll(state.message));
  }, [state, toast, tAll]);

  return (
    <form action={action} className="form-grid" noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      <div className="form-grid form-grid--2">
        <Input
          label={t("displayName")}
          name="displayName"
          autoComplete="name"
          required
          defaultValue={v?.displayName ?? profile.displayName}
          error={err("displayName")}
        />
        <Input
          label={t("phone")}
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={v?.phone ?? profile.phone}
          error={err("phone")}
        />
        <Select
          label={t("locale")}
          name="locale"
          defaultValue={v?.locale ?? profile.locale}
          options={[
            { value: "fr", label: "Français" },
            { value: "en", label: "English" },
          ]}
          error={err("locale")}
        />
        <Input label={t("email")} value={profile.email} readOnly />
        <Input label={t("role")} value={profile.roleLabel} readOnly />
        <Input label={t("company")} value={profile.companyName} readOnly />
      </div>
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {tAll("common.save")}
        </Button>
      </div>
    </form>
  );
}

export function ProfileTabs({ profile }: { profile: ProfileData }) {
  const t = useTranslations("profile");

  return (
    <Tabs
      label={t("title")}
      items={[
        {
          id: "info",
          label: t("tabs.info"),
          content: (
            <Card>
              <ProfileForm profile={profile} />
            </Card>
          ),
        },
        {
          id: "security",
          label: t("tabs.security"),
          content: (
            <Card title={t("updatePassword")}>
              <div style={{ maxWidth: 440 }}>
                <NewPasswordForm
                  passwordLabel={t("newPassword")}
                  confirmLabel={t("confirmPassword")}
                  submitLabel={t("updatePassword")}
                  onSuccess="toast"
                />
              </div>
            </Card>
          ),
        },
      ]}
    />
  );
}
