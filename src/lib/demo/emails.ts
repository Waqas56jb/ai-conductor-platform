import { slotLabel } from "./slots";

type Locale = "fr" | "en";
type Request = {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sector: string | null;
  message: string | null;
  slot_start: string;
  locale: Locale;
  source: string | null;
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain, readable HTML: one column, system font, works in every mail client. */
function layout(paragraphs: string[], button?: { label: string; href: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${escape(button.href)}" style="background:#2f6bff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escape(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fb"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">${body}${cta}<p style="margin:24px 0 0;color:#6b7280;font-size:13px">Pratonna · pratonna.com</p></div></body></html>`;
}

const COPY = {
  fr: {
    receivedSubject: "Votre démo gratuite Pratonna : demande bien reçue",
    hello: (n: string) => `Bonjour ${n},`,
    received: (slot: string) =>
      `Merci pour votre demande de démonstration gratuite. Nous avons bien noté le créneau du <strong>${slot}</strong> (heure de Paris, 30 minutes, en visio).`,
    next: "Nous vous confirmons le rendez-vous par e-mail sous 24 h ouvrées, avec le lien de la visio.",
    free: "La démonstration et le test pilote sont entièrement gratuits et sans engagement.",
    confirmedSubject: (slot: string) => `Démo Pratonna confirmée : ${slot}`,
    confirmed: (slot: string) =>
      `Votre démonstration gratuite est confirmée le <strong>${slot}</strong> (heure de Paris, 30 minutes). L’invitation est jointe : ajoutez-la à votre agenda.`,
    link: "Nous vous enverrons le lien de la visio avant le rendez-vous. Pour changer de créneau, répondez simplement à cet e-mail.",
    sign: "À très vite,<br>L’équipe Pratonna",
    inviteSummary: "Démo gratuite Pratonna (30 min)",
    inviteDescription: "Démonstration gratuite et sans engagement de Pratonna, en visio.",
  },
  en: {
    receivedSubject: "Your free Pratonna demo: request received",
    hello: (n: string) => `Hello ${n},`,
    received: (slot: string) =>
      `Thank you for booking a free demo. We have noted the slot on <strong>${slot}</strong> (Paris time, 30 minutes, video call).`,
    next: "We will confirm the meeting by email within one business day, with the video link.",
    free: "The demo and the pilot are completely free, with no commitment.",
    confirmedSubject: (slot: string) => `Pratonna demo confirmed: ${slot}`,
    confirmed: (slot: string) =>
      `Your free demo is confirmed on <strong>${slot}</strong> (Paris time, 30 minutes). The invitation is attached: add it to your calendar.`,
    link: "We will send the video link before the meeting. To change the slot, just reply to this email.",
    sign: "Speak soon,<br>The Pratonna team",
    inviteSummary: "Free Pratonna demo (30 min)",
    inviteDescription: "Free, no-commitment demo of Pratonna, by video call.",
  },
} satisfies Record<Locale, unknown>;

export const inviteText = (locale: Locale) => ({
  summary: COPY[locale].inviteSummary,
  description: COPY[locale].inviteDescription,
});

const textOf = (html: string) =>
  html
    .replace(/<br>/g, "\n")
    .replace(/<\/p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .trim();

/** To the prospect, as soon as they submit the form. */
export function receivedEmail(r: Request) {
  const c = COPY[r.locale];
  const slot = slotLabel(r.slot_start, r.locale);
  const html = layout([escape(c.hello(r.name)), c.received(slot), c.next, c.free, c.sign]);
  return { subject: c.receivedSubject, html, text: textOf(html) };
}

/** To the prospect, when the team confirms the meeting. */
export function confirmedEmail(r: Request) {
  const c = COPY[r.locale];
  const slot = slotLabel(r.slot_start, r.locale);
  const html = layout([escape(c.hello(r.name)), c.confirmed(slot), c.link, c.free, c.sign]);
  return { subject: c.confirmedSubject(slot), html, text: textOf(html) };
}

/** To the Pratonna team: who, when, and the link to confirm or cancel. */
export function teamEmail(r: Request, manageUrl: string) {
  const slot = slotLabel(r.slot_start, "fr");
  const rows: [string, string | null][] = [
    ["Nom", r.name],
    ["E-mail", r.email],
    ["Téléphone", r.phone],
    ["Entreprise", r.company],
    ["Secteur", r.sector],
    ["Message", r.message],
    ["Provenance", r.source],
  ];
  const details = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<strong>${k} :</strong> ${escape(v!)}`)
    .join("<br>");
  const html = layout(
    [`Nouvelle demande de démo gratuite pour le <strong>${slot}</strong>.`, details],
    { label: "Confirmer ou annuler", href: manageUrl },
  );
  return { subject: `Nouvelle démo : ${r.name} · ${slot}`, html, text: `${textOf(html)}\n\n${manageUrl}` };
}
