import { Building2, LayoutDashboard, UserRound, type LucideIcon } from "lucide-react";
import type { NavIcon } from "@/lib/navigation";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  company: Building2,
  profile: UserRound,
};
