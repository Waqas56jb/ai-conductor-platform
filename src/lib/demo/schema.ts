import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), trimmed(max).optional());

/** Where a visitor came from: utm_* parameters or ?src=qr, never who they are. */
export const attributionSchema = z.object({
  source: optionalText(60),
  medium: optionalText(60),
  campaign: optionalText(80),
});

export const demoRequestSchema = attributionSchema.extend({
  name: trimmed(120).min(2),
  email: z.email().max(254).transform((e) => e.toLowerCase()),
  phone: optionalText(40),
  company: optionalText(160),
  sector: optionalText(80),
  message: optionalText(2000),
  slot: z.iso.datetime(),
  locale: z.enum(["fr", "en"]).default("fr"),
  consent: z.literal(true),
  // Honeypot: a hidden field people never fill in.
  website: z.string().max(0).optional(),
});
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

/** Events the browser may send; submissions and confirmations are recorded by the server. */
export const CLIENT_EVENTS = ["page_view", "demo_click", "video_play"] as const;

export const siteEventSchema = attributionSchema.extend({
  name: z.enum(CLIENT_EVENTS),
  page: optionalText(120),
  placement: optionalText(40),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
});
