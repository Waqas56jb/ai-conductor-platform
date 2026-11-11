import { DEMO_MINUTES } from "./slots";

/** iCalendar UTC stamp: 20261112T093000Z. */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 text escaping. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");

/** Lines longer than 75 octets are folded (continuation lines start with a space). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** A single-event calendar invitation for a confirmed demo. */
export function demoInvite(input: {
  id: string;
  start: string;
  summary: string;
  description: string;
  organizer: string;
  attendee: string;
  now?: Date;
}): string {
  const start = new Date(input.start);
  const end = new Date(start.getTime() + DEMO_MINUTES * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pratonna//Demo//FR",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.id}@pratonna.com`,
    `DTSTAMP:${stamp(input.now ?? new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(input.summary)}`,
    `DESCRIPTION:${text(input.description)}`,
    `ORGANIZER;CN=Pratonna:mailto:${input.organizer}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${input.attendee}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}
