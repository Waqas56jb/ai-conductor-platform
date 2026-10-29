import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CaseTable } from "@/components/cases/CaseTable";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getSettings, listCases } from "@/lib/cases/queries";
import type { IncidentStatus } from "@/lib/workflows/incident";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("approvals"))("title") };
}

export default async function ApprovalsPage() {
  const profile = await requireRole(["manager", "director", "admin"]);
  const [t, format, settings] = await Promise.all([
    getTranslations("approvals"),
    getFormatter(),
    getSettings(),
  ]);

  // Managers approve below the threshold; the director above it; admins both.
  const statuses: IncidentStatus[] =
    profile.role === "manager"
      ? ["devis_pending_manager"]
      : profile.role === "director"
        ? ["devis_pending_director"]
        : ["devis_pending_manager", "devis_pending_director"];
  const cases = await listCases({ statuses });
  const threshold = format.number(settings.threshold, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="stack">
      <LiveRefresh channel="approvals" tables={[{ table: "ai_conductor_incidents" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{profile.role === "director" ? t("subDirector", { threshold }) : t("sub")}</p>
        </div>
      </div>
      <Card flush>
        <CaseTable
          cases={cases}
          caption={t("title")}
          empty={<EmptyState icon={<ClipboardCheck />} title={t("empty")} />}
        />
      </Card>
    </div>
  );
}
