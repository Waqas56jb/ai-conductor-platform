import { z } from "zod";
import { locales } from "@/i18n/config";

// Error messages are keys of the "validation" message namespace.

const required = (max: number) =>
  z.string().trim().min(1, { error: "required" }).max(max, { error: "tooLong" });
const optional = (max: number) => z.string().trim().max(max, { error: "tooLong" });

const phone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[+0-9 ().-]{6,20}$/.test(v), { error: "phone" });

export const LEGAL_FORMS = [
  "SAS",
  "SASU",
  "SARL",
  "EURL",
  "SA",
  "SCI",
  "SNC",
  "EI",
  "Micro-entreprise",
] as const;

export const profileSchema = z.object({
  displayName: required(120),
  phone,
  locale: z.enum(locales, { error: "required" }),
});

export const companySchema = z.object({
  name: required(200),
  legalForm: z.union([z.literal(""), z.enum(LEGAL_FORMS)], { error: "required" }),
  // Spaces are common when typing a SIRET ("123 456 789 00012").
  siret: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v), { error: "siret" }),
  vatNumber: optional(20),
  address: optional(200),
  postalCode: optional(12),
  city: optional(120),
  country: required(80),
  phone,
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, { error: "email" }),
});
