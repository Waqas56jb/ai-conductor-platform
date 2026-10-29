import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportForm } from "@/components/cases/ReportForm";
import { requireRole } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("cases.report"))("title") };
}

export default async function NewCasePage() {
  const profile = await requireRole(["client", "manager", "director", "admin"]);
  const t = await getTranslations("cases.report");
  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      <ReportForm staff={profile.role !== "client"} />
    </div>
  );
}
