import type { SiteEventRow } from "@/lib/db/types";

type Event = Pick<SiteEventRow, "name" | "source">;

export type Funnel = {
  visits: number;
  clicks: number;
  submitted: number;
  confirmed: number;
  /** Share of demo clicks that became a request, 0–1 (null without clicks). */
  clickToRequest: number | null;
};

const count = (events: readonly Event[], name: Event["name"]) =>
  events.filter((e) => e.name === name).length;

export function funnel(events: readonly Event[]): Funnel {
  const clicks = count(events, "demo_click");
  const submitted = count(events, "demo_submit");
  return {
    visits: count(events, "page_view"),
    clicks,
    submitted,
    confirmed: count(events, "demo_confirmed"),
    clickToRequest: clicks ? Math.min(1, submitted / clicks) : null,
  };
}

/** Funnel per traffic source ("direct" when none), busiest first. */
export function bySource(events: readonly Event[]): (Funnel & { source: string })[] {
  const groups = new Map<string, Event[]>();
  for (const e of events) {
    const key = e.source?.toLowerCase() || "direct";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups]
    .map(([source, list]) => ({ source, ...funnel(list) }))
    .sort((a, b) => b.visits + b.clicks - (a.visits + a.clicks));
}

/** The Pratonna team, by sign-in email (PLATFORM_ADMIN_EMAILS, comma-separated). */
export const isPlatformAdmin = (email: string | null | undefined, allowList: string | undefined) =>
  Boolean(
    email &&
      allowList
        ?.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .includes(email.toLowerCase()),
  );
