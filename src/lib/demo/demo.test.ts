import { describe, expect, it } from "vitest";
import { confirmedEmail, receivedEmail, teamEmail } from "./emails";
import { bySource, funnel, isPlatformAdmin } from "./funnel";
import { demoInvite } from "./ics";
import { demoRequestSchema, siteEventSchema } from "./schema";
import { freeSlots, isBookable, parisParts, parisTime, slotGrid, slotLabel } from "./slots";

// Tuesday 10 November 2026, 08:00 in Paris (UTC+1).
const NOW = new Date("2026-11-10T07:00:00Z");

describe("demo slots", () => {
  it("converts Paris wall-clock time in winter and summer", () => {
    expect(parisTime("2026-11-12", 9, 0).toISOString()).toBe("2026-11-12T08:00:00.000Z");
    expect(parisTime("2026-07-02", 9, 0).toISOString()).toBe("2026-07-02T07:00:00.000Z");
  });

  it("offers weekday office hours, 12 h ahead at least, never on holidays", () => {
    const grid = slotGrid(NOW);
    const days = new Set(grid.map((s) => parisParts(s).day));
    // Today's slots before 20:00 are too close; 11 November is a holiday.
    expect(days.has("2026-11-10")).toBe(false);
    expect(days.has("2026-11-11")).toBe(false);
    expect(days.has("2026-11-14")).toBe(false); // Saturday
    const thursday = grid.filter((s) => parisParts(s).day === "2026-11-12");
    expect(thursday).toHaveLength(18); // 09:00 … 17:30, every 30 minutes
    expect(parisParts(thursday[0]!).hour).toBe(9);
    expect(parisParts(thursday.at(-1)!)).toMatchObject({ hour: 17, minute: 30 });
  });

  it("hides taken slots and refuses times off the grid", () => {
    const taken = parisTime("2026-11-12", 10, 30).toISOString();
    expect(freeSlots(NOW, [taken])).not.toContain(taken);
    expect(isBookable(taken, NOW)).toBe(true);
    expect(isBookable(parisTime("2026-11-12", 10, 15).toISOString(), NOW)).toBe(false);
    expect(isBookable(parisTime("2026-11-14", 10, 0).toISOString(), NOW)).toBe(false);
    expect(isBookable("not a date", NOW)).toBe(false);
  });

  it("labels slots in Paris time", () => {
    const slot = parisTime("2026-11-12", 10, 30).toISOString();
    expect(slotLabel(slot, "fr")).toBe("jeudi 12 novembre à 10:30");
    expect(slotLabel(slot, "en")).toBe("Thursday 12 November at 10:30");
  });
});

describe("calendar invitation", () => {
  it("is a valid 30-minute VEVENT with CRLF lines of 75 octets at most", () => {
    const ics = demoInvite({
      id: "abc",
      start: "2026-11-12T09:30:00.000Z",
      summary: "Démo gratuite Pratonna (30 min)",
      description: "Démonstration gratuite, sans engagement; en visio, avec une description assez longue pour être repliée.",
      organizer: "contact@pratonna.com",
      attendee: "jean@example.com",
      now: new Date("2026-11-10T07:00:00Z"),
    });
    expect(ics).toContain("DTSTART:20261112T093000Z\r\n");
    expect(ics).toContain("DTEND:20261112T100000Z\r\n");
    expect(ics).toContain("engagement\\; en visio");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});

describe("demo request validation", () => {
  const valid = {
    name: "Jean Martin",
    email: "Jean@Agence.FR",
    slot: "2026-11-12T09:30:00.000Z",
    consent: true,
    company: "  ",
    source: "qr",
  };

  it("normalises the email and drops blank optional fields", () => {
    const r = demoRequestSchema.parse(valid);
    expect(r.email).toBe("jean@agence.fr");
    expect(r.company).toBeUndefined();
    expect(r.locale).toBe("fr");
    expect(r.source).toBe("qr");
  });

  it("requires consent and an empty honeypot", () => {
    expect(demoRequestSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });

  it("only accepts the events the browser may send", () => {
    expect(siteEventSchema.safeParse({ name: "demo_click", placement: "header" }).success).toBe(true);
    expect(siteEventSchema.safeParse({ name: "demo_confirmed" }).success).toBe(false);
  });
});

describe("demo emails", () => {
  const request = {
    name: "Jean <b>Martin</b>",
    email: "jean@example.com",
    phone: null,
    company: "Agence du Parc",
    sector: "Agence immobilière",
    message: null,
    slot_start: "2026-11-12T09:30:00.000Z",
    locale: "fr" as const,
    source: "qr",
  };

  it("says the demo is free, escapes names, and gives the team a manage link", () => {
    const received = receivedEmail(request);
    expect(received.html).toContain("Jean &lt;b&gt;Martin&lt;/b&gt;");
    expect(received.text).toContain("gratuits et sans engagement");
    expect(received.text).toContain("jeudi 12 novembre à 10:30");
    expect(confirmedEmail(request).subject).toBe("Démo Pratonna confirmée : jeudi 12 novembre à 10:30");
    const team = teamEmail(request, "https://app.pratonna.com/demo/tok");
    expect(team.html).toContain('href="https://app.pratonna.com/demo/tok"');
    expect(team.text).toContain("Provenance : qr");
  });
});

describe("conversion funnel", () => {
  const events = [
    { name: "page_view", source: "qr" },
    { name: "page_view", source: null },
    { name: "demo_click", source: "qr" },
    { name: "demo_click", source: null },
    { name: "demo_submit", source: "QR" },
    { name: "demo_confirmed", source: "qr" },
  ] as const;

  it("counts each step and the click-to-request rate", () => {
    expect(funnel(events)).toEqual({ visits: 2, clicks: 2, submitted: 1, confirmed: 1, clickToRequest: 0.5 });
    expect(funnel([]).clickToRequest).toBeNull();
  });

  it("groups by source, case-insensitively, with direct traffic", () => {
    const rows = bySource(events);
    expect(rows.map((r) => r.source)).toEqual(["qr", "direct"]);
    expect(rows[0]).toMatchObject({ visits: 1, clicks: 1, submitted: 1, confirmed: 1 });
  });

  it("only lets the listed team emails in", () => {
    expect(isPlatformAdmin("Boss@Pratonna.com", " boss@pratonna.com, x@y.fr")).toBe(true);
    expect(isPlatformAdmin("admin@pratonna-demo.test", "boss@pratonna.com")).toBe(false);
    expect(isPlatformAdmin("boss@pratonna.com", undefined)).toBe(false);
  });
});
