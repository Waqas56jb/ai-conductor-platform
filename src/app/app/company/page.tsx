import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompanyForm } from "@/components/account/CompanyForm";
import { WorkflowSettingsForm } from "@/components/account/WorkflowSettingsForm";
import { Badge, Card, Table, type Column } from "@/components/ui";
import { COMPANY_ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import type { UserRow } from "@/lib/db/types";
import { getSettings } from "@/lib/cases/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("company"))("title") };
}

type Member = Pick<UserRow, "id" | "display_name" | "email" | "role" | "active">;

export default async function CompanyPage() {
  const profile = await requireRole(COMPANY_ADMIN_ROLES);
  const [t, tRoles, tw, settings] = await Promise.all([
    getTranslations("company"),
    getTranslations("roles"),
    getTranslations("workflowSettings"),
    getSettings(),
  ]);
  const supabase = await createClient();

  const [{ data: company }, { data: team }] = await Promise.all([
    supabase.from("ai_conductor_companies").select("*").eq("id", profile.company_id).single(),
    supabase
      .from("ai_conductor_users")
      .select("id, display_name, email, role, active")
      .order("display_name"),
  ]);
  if (!company) throw new Error("Company not found for profile");

  const members: Member[] = team ?? [];
  const columns: Column<Member>[] = [
    {
      key: "name",
      header: t("columns.name"),
      render: (m) => (
        <strong>
          {m.display_name || m.email}
          {m.id === profile.id ? ` (${t("you")})` : ""}
        </strong>
      ),
    },
    { key: "email", header: t("columns.email"), render: (m) => m.email },
    {
      key: "role",
      header: t("columns.role"),
      render: (m) => <Badge tone="violet">{tRoles(m.role)}</Badge>,
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (m) => (
        <Badge tone={m.active ? "success" : "neutral"}>
          {m.active ? t("active") : t("inactive")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>

      <Card title={t("infoTitle")}>
        <CompanyForm
          company={{
            name: company.name,
            legalForm: company.legal_form ?? "",
            siret: company.siret ?? "",
            vatNumber: company.vat_number ?? "",
            address: company.address,
            postalCode: company.postal_code,
            city: company.city,
            country: company.country,
            phone: company.phone ?? "",
            email: company.email ?? "",
          }}
        />
      </Card>

      <Card title={tw("title")} description={tw("sub")}>
        <WorkflowSettingsForm settings={settings} />
      </Card>

      <Card title={t("teamTitle")} description={t("teamCount", { count: members.length })} flush>
        <Table caption={t("teamTitle")} columns={columns} rows={members} getRowKey={(m) => m.id} />
      </Card>
    </div>
  );
}
