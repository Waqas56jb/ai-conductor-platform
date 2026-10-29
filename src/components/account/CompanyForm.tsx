"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCompany } from "@/app/app/actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button, Input, Select, useToast } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { LEGAL_FORMS } from "@/lib/validation/account";

export type CompanyFormData = {
  name: string;
  legalForm: string;
  siret: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
};

export function CompanyForm({ company }: { company: CompanyFormData }) {
  const t = useTranslations("company");
  const tv = useTranslations("validation");
  const tAll = useTranslations();
  const toast = useToast();
  const [state, action, pending] = useActionState(updateCompany, initialFormState);
  const err = (field: string) =>
    state.fieldErrors?.[field] ? tv(state.fieldErrors[field]) : undefined;
  const value = (field: keyof CompanyFormData) => state.values?.[field] ?? company[field];

  useEffect(() => {
    if (state.status === "success" && state.message) toast(tAll(state.message));
  }, [state, toast, tAll]);

  return (
    <form action={action} className="form-grid" noValidate>
      {state.status === "error" ? <FormAlert messageKey={state.message} tone="error" /> : null}
      <div className="form-grid form-grid--2">
        <Input
          label={t("name")}
          name="name"
          required
          defaultValue={value("name")}
          error={err("name")}
        />
        <Select
          label={t("legalForm")}
          name="legalForm"
          defaultValue={value("legalForm")}
          options={[{ value: "", label: "—" }, ...LEGAL_FORMS.map((f) => ({ value: f, label: f }))]}
          error={err("legalForm")}
        />
        <Input
          label={t("siret")}
          name="siret"
          inputMode="numeric"
          defaultValue={value("siret")}
          error={err("siret")}
          optionalLabel={tAll("common.optional")}
        />
        <Input
          label={t("vat")}
          name="vatNumber"
          defaultValue={value("vatNumber")}
          error={err("vatNumber")}
          optionalLabel={tAll("common.optional")}
        />
        <Input
          label={t("address")}
          name="address"
          autoComplete="street-address"
          defaultValue={value("address")}
          error={err("address")}
        />
        <Input
          label={t("postalCode")}
          name="postalCode"
          autoComplete="postal-code"
          defaultValue={value("postalCode")}
          error={err("postalCode")}
        />
        <Input
          label={t("city")}
          name="city"
          autoComplete="address-level2"
          defaultValue={value("city")}
          error={err("city")}
        />
        <Input
          label={t("country")}
          name="country"
          autoComplete="country-name"
          required
          defaultValue={value("country")}
          error={err("country")}
        />
        <Input
          label={t("phone")}
          name="phone"
          type="tel"
          defaultValue={value("phone")}
          error={err("phone")}
        />
        <Input
          label={t("email")}
          name="email"
          type="email"
          defaultValue={value("email")}
          error={err("email")}
        />
      </div>
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {tAll("common.save")}
        </Button>
      </div>
    </form>
  );
}
