import type { BadgeTone } from "@/components/ui";
import type { ServiceOrderStatus } from "@/lib/workflows/service-order";

export const STATUS_TONE: Record<ServiceOrderStatus, BadgeTone> = {
  draft: "neutral",
  funds_check: "info",
  accountant_review: "violet",
  esign: "warning",
  sent: "success",
  cancelled: "danger",
};
