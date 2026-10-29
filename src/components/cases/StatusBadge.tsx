import { getTranslations } from "next-intl/server";
import { Badge, type BadgeTone } from "@/components/ui";
import type { Urgency } from "@/lib/db/types";
import type { IncidentStatus } from "@/lib/workflows/incident";

const STATUS_TONE: Record<IncidentStatus, BadgeTone> = {
  new: "info",
  awaiting_assignment: "warning",
  site_visit: "info",
  devis_pending_manager: "violet",
  devis_pending_director: "violet",
  sent_to_client: "violet",
  client_signed: "success",
  intervention_planned: "info",
  in_progress: "info",
  invoiced: "warning",
  closed: "success",
  cancelled: "neutral",
};

const URGENCY_TONE: Record<Urgency, BadgeTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

export async function StatusBadge({ status }: { status: IncidentStatus }) {
  const t = await getTranslations("status");
  return <Badge tone={STATUS_TONE[status]}>{t(status)}</Badge>;
}

export async function UrgencyBadge({ urgency }: { urgency: Urgency | null }) {
  if (!urgency) return null;
  const t = await getTranslations("urgency");
  return <Badge tone={URGENCY_TONE[urgency]}>{t(urgency)}</Badge>;
}
