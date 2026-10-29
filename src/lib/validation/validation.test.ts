import { describe, expect, it } from "vitest";
import { companySchema, profileSchema } from "./account";
import { loginSchema, newPasswordSchema, signupSchema } from "./auth";
import { fieldErrors } from "./errors";

const errorsOf = (result: { success: boolean; error?: Parameters<typeof fieldErrors>[0] }) =>
  result.success || !result.error ? {} : fieldErrors(result.error);

describe("auth schemas", () => {
  it("normalises the email", () => {
    const r = loginSchema.parse({ email: "  Jean@Exemple.FR ", password: "x" });
    expect(r.email).toBe("jean@exemple.fr");
  });

  it("rejects weak passwords with a precise key", () => {
    const base = { fullName: "Jean", companyName: "ACME", email: "jean@exemple.fr" };
    expect(errorsOf(signupSchema.safeParse({ ...base, password: "short1" })).password).toBe(
      "passwordLength",
    );
    expect(errorsOf(signupSchema.safeParse({ ...base, password: "onlyletters" })).password).toBe(
      "passwordStrength",
    );
    expect(signupSchema.safeParse({ ...base, password: "bonjour2026" }).success).toBe(true);
  });

  it("requires every signup field", () => {
    const errors = errorsOf(
      signupSchema.safeParse({ fullName: " ", companyName: "", email: "x", password: "" }),
    );
    expect(errors).toMatchObject({ fullName: "required", companyName: "required", email: "email" });
  });

  it("checks that both new passwords match", () => {
    const r = newPasswordSchema.safeParse({ password: "bonjour2026", confirm: "bonjour2027" });
    expect(errorsOf(r)).toEqual({ confirm: "passwordMismatch" });
  });
});

describe("account schemas", () => {
  it("validates the profile", () => {
    expect(
      profileSchema.safeParse({ displayName: "Léa", phone: "+33 6 12 34 56 78", locale: "fr" })
        .success,
    ).toBe(true);
    expect(
      errorsOf(profileSchema.safeParse({ displayName: "Léa", phone: "abc", locale: "de" })),
    ).toEqual({
      phone: "phone",
      locale: "required",
    });
  });

  const company = {
    name: "Pratonna Gestion",
    legalForm: "SAS",
    siret: "",
    vatNumber: "",
    address: "",
    postalCode: "",
    city: "",
    country: "France",
    phone: "",
    email: "",
  };

  it("accepts a SIRET typed with spaces and stores digits only", () => {
    const r = companySchema.parse({ ...company, siret: "123 456 789 00012" });
    expect(r.siret).toBe("12345678900012");
  });

  it("rejects an invalid SIRET, legal form and email", () => {
    const errors = errorsOf(
      companySchema.safeParse({ ...company, siret: "1234", legalForm: "LLC", email: "nope" }),
    );
    expect(errors).toEqual({ siret: "siret", legalForm: "required", email: "email" });
  });
});
