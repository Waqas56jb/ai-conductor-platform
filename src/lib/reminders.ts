import { z } from "zod";
import type { Source } from "@/lib/notifications/priority";

export const REMINDER_KINDS = ["meeting", "call", "email", "task", "follow_up"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** Where a reminder notification says it comes from (smart inbox source). */
export const REMINDER_SOURCE: Record<ReminderKind, Source> = {
  meeting: "meeting",
  call: "call",
  email: "email",
  task: "task",
  follow_up: "task",
};

/** What a reminder may be about: a case, a quote or an invoice. */
export const reminderEntitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("incident"), id: z.string().regex(/^INC-[A-Z0-9-]{4,40}$/) }),
  z.object({ type: z.literal("quotation"), id: z.string().regex(/^DEV-[A-Z0-9-]{4,40}$/) }),
  z.object({ type: z.literal("invoice"), id: z.string().regex(/^FAC-[A-Z0-9-]{4,40}$/) }),
]);
export type ReminderEntity = z.infer<typeof reminderEntitySchema>;

// Error messages are keys of the "validation" namespace.
export const reminderSchema = z.object({
  kind: z.enum(REMINDER_KINDS, { error: "required" }),
  title: z.string().trim().min(1, { error: "required" }).max(200, { error: "tooLong" }),
  notes: z.string().trim().max(1000, { error: "tooLong" }),
  // From a datetime-local field (Paris time) or an ISO date with offset.
  dueAt: z
    .string()
    .min(1, { error: "required" })
    .refine((v) => !Number.isNaN(Date.parse(v)), { error: "required" }),
});
export type ReminderInput = z.infer<typeof reminderSchema>;
