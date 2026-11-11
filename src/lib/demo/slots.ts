/**
 * Free demo slots: 30-minute video calls on weekdays, Paris office hours.
 * Pure functions (no I/O) so the booking rules are unit-tested.
 */

export const DEMO_MINUTES = 30;
/** First and last start times of the day, Paris local time. */
const FIRST = { h: 9, m: 0 };
const LAST = { h: 17, m: 30 };
/** Bookable from this many hours from now, up to this many days ahead. */
const MIN_LEAD_HOURS = 12;
const HORIZON_DAYS = 14;

// French public holidays with a fixed date (MM-DD); the movable ones (Easter
// Monday, Ascension, Whit Monday) are listed per year below.
const FIXED_HOLIDAYS = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
const MOVABLE_HOLIDAYS = [
  "2026-04-06",
  "2026-05-14",
  "2026-05-25",
  "2027-03-29",
  "2027-05-06",
  "2027-05-17",
  "2028-04-17",
  "2028-05-25",
  "2028-06-05",
];

const PARIS_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

/** Paris wall-clock parts of an instant. */
export function parisParts(date: Date) {
  const p = Object.fromEntries(PARIS_PARTS.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: p.weekday as string,
  };
}

/** The instant at which Paris shows `day` (YYYY-MM-DD) at hh:mm. */
export function parisTime(day: string, hour: number, minute: number): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, hour, minute);
  // Paris is UTC+1 or UTC+2: correct the guess by the offset seen at that instant.
  const seen = parisParts(new Date(guess));
  const seenUtc = Date.UTC(
    Number(seen.day.slice(0, 4)),
    Number(seen.day.slice(5, 7)) - 1,
    Number(seen.day.slice(8, 10)),
    seen.hour,
    seen.minute,
  );
  return new Date(guess - (seenUtc - guess));
}

export const isHoliday = (day: string) =>
  FIXED_HOLIDAYS.includes(day.slice(5)) || MOVABLE_HOLIDAYS.includes(day);

/** Every slot start in office hours over the booking window, taken or not. */
export function slotGrid(now: Date): Date[] {
  const earliest = now.getTime() + MIN_LEAD_HOURS * 3_600_000;
  const out: Date[] = [];
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const { day, weekday } = parisParts(new Date(now.getTime() + i * 86_400_000));
    if (weekday === "Sat" || weekday === "Sun" || isHoliday(day)) continue;
    for (let t = FIRST.h * 60 + FIRST.m; t <= LAST.h * 60 + LAST.m; t += DEMO_MINUTES) {
      const start = parisTime(day, Math.floor(t / 60), t % 60);
      if (start.getTime() >= earliest) out.push(start);
    }
  }
  return out;
}

/** Bookable slots: the grid minus the ones already taken. */
export function freeSlots(now: Date, taken: readonly (string | Date)[]): string[] {
  const busy = new Set(taken.map((t) => new Date(t).getTime()));
  return slotGrid(now)
    .filter((s) => !busy.has(s.getTime()))
    .map((s) => s.toISOString());
}

/** True when `iso` is a slot of the current grid (not a past, odd or weekend time). */
export function isBookable(iso: string, now: Date): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && slotGrid(now).some((s) => s.getTime() === t);
}

/** "jeudi 12 novembre à 10:30" / "Thursday 12 November at 10:30" (Paris time). */
export function slotLabel(iso: string, locale: "fr" | "en"): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const { hour, minute } = parisParts(date);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return locale === "fr" ? `${day} à ${time}` : `${day} at ${time}`;
}
