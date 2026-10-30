"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export type LiveTable =
  | "ai_conductor_incidents"
  | "ai_conductor_incident_messages"
  | "ai_conductor_group_messages"
  | "ai_conductor_reminders"
  | "ai_conductor_signature_requests"
  | "ai_conductor_team_tasks"
  | "ai_conductor_notifications"
  | "ai_conductor_quotations"
  | "ai_conductor_invoices"
  | "ai_conductor_payments"
  | "ai_conductor_service_orders";

type Props = {
  /** Unique per page instance, e.g. "case-INC-2026-0001". */
  channel: string;
  tables: readonly { table: LiveTable; filter?: string }[];
};

/**
 * Re-renders the page's server data when a watched row changes. RLS decides
 * which changes this user receives, so nothing leaks across roles/companies.
 */
export function LiveRefresh({ channel, tables }: Props) {
  const router = useRouter();
  const key = JSON.stringify(tables);

  useEffect(() => {
    const supabase = browserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several rows often change together: refresh once.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    let ch = supabase.channel(channel);
    for (const { table, filter } of JSON.parse(key) as Props["tables"]) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        refresh,
      );
    }

    let cancelled = false;
    // Realtime needs the user's access token to apply RLS.
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      ch.subscribe();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [channel, key, router]);

  return null;
}
