import { z } from "zod";

// Error messages are keys of the "validation" message namespace.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "email" }));

export const passwordSchema = z
  .string()
  .min(8, { error: "passwordLength" })
  .max(72, { error: "tooLong" })
  .regex(/[A-Za-z]/, { error: "passwordStrength" })
  .regex(/\d/, { error: "passwordStrength" });

const text = (max: number) =>
  z.string().trim().min(1, { error: "required" }).max(max, { error: "tooLong" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "required" }),
});

export const signupSchema = z.object({
  fullName: text(120),
  companyName: text(200),
  email,
  password: passwordSchema,
});

export const forgotSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "passwordMismatch", path: ["confirm"] });
