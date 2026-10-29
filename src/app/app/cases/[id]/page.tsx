import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CaseActions } from "@/components/cases/CaseActions";
import {
  CaseTimeline,
  InterventionCard,
  InvoiceCard,
  QuoteCard,
} from "@/components/cases/CaseSummaryCards";
import { ChatPanel } from "@/components/cases/ChatPanel";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { PhotoGallery } from "@/components/cases/PhotoGallery";
import { StatusBadge, UrgencyBadge } from "@/components/cases/StatusBadge";
import styles from "@/components/cases/cases.module.css";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import {
  getCaseDetail,
  getSettings,
  listTechnicians,
  type TechnicianCard,
} from "@/lib/cases/queries";
import { availableActions } from "@/lib/workflows/incident";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: (await params).id };
}

export default async function CasePage({ params }: Params) {
  const { id } = await params;
  const profile = await requireProfile();
  const detail = await getCaseDetail(id);
  if (!detail) notFound();

  const { incident, quote, intervention, invoice, people } = detail;
  const [t, tc, format, settings] = await Promise.all([
    getTranslations("cases"),
    getTranslations("channel"),
    getFormatter(),
    getSettings(),
  ]);

  const isClient = profile.role === "client";
  const isStaff = ["manager", "director", "admin", "accountant"].includes(profile.role);
  const actions = availableActions(incident.status, {
    role: profile.role,
    isAssignedTechnician: incident.hired_tech_ids.includes(profile.id),
    isReporter: incident.client_id === profile.id,
    approvalThreshold: settings.threshold,
  });
  const technicians: TechnicianCard[] = actions.includes("assign") ? await listTechnicians() : [];
  const name = (uid: string | null) => (uid ? (people.get(uid)?.display_name ?? "—") : "—");
  const reporter = incident.client_id
    ? name(incident.client_id)
    : (incident.complainant_name ?? "—");

  return (
    <div className="stack">
      <LiveRefresh
        channel={`case-${id}`}
        tables={[
          { table: "ai_conductor_incidents", filter: `id=eq.${id}` },
          { table: "ai_conductor_incident_messages", filter: `incident_id=eq.${id}` },
          ...(incident.group_id
            ? [
                {
                  table: "ai_conductor_group_messages" as const,
                  filter: `group_id=eq.${incident.group_id}`,
                },
              ]
            : []),
          { table: "ai_conductor_quotations", filter: `incident_id=eq.${id}` },
          { table: "ai_conductor_invoices", filter: `incident_id=eq.${id}` },
        ]}
      />
      <div>
        <Link href="/app/cases" className={styles.back}>
          <ArrowLeft aria-hidden="true" />
          {t("detail.back")}
        </Link>
        <div className="page-header">
          <div>
            <h1>{incident.title}</h1>
            <p>
              {incident.reference} · {incident.building_address}
              {incident.unit_label ? ` · ${incident.unit_label}` : ""}
            </p>
          </div>
          <div className={styles.badges}>
            <StatusBadge status={incident.status} />
            <UrgencyBadge urgency={incident.urgency} />
          </div>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.column}>
          <Card>
            <dl className={styles.meta}>
              <div>
                <dt>{t("detail.reportedBy")}</dt>
                <dd>{reporter}</dd>
              </div>
              <div>
                <dt>{t("detail.channel")}</dt>
                <dd>{tc(incident.channel)}</dd>
              </div>
              <div>
                <dt>{t("detail.created")}</dt>
                <dd>
                  {format.dateTime(new Date(incident.created_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
              <div>
                <dt>{t("detail.technicians")}</dt>
                <dd>
                  {incident.hired_tech_ids.length
                    ? incident.hired_tech_ids.map((tid) => name(tid)).join(", ")
                    : t("detail.noTechnician")}
                </dd>
              </div>
            </dl>
            {incident.description ? (
              <p className={styles.description}>{incident.description}</p>
            ) : null}
          </Card>

          <Card title={t("detail.photos")}>
            <PhotoGallery photos={incident.photos} urls={detail.photoUrls} />
          </Card>

          {quote &&
          (!isClient || !["pending_manager", "pending_director"].includes(quote.status)) ? (
            <QuoteCard quote={quote} showDiagnosis={!isClient} />
          ) : null}
          {intervention ? <InterventionCard intervention={intervention} /> : null}
          {invoice ? (
            <InvoiceCard
              invoice={invoice}
              receiptUrl={detail.receiptUrl}
              canUpload={isClient && invoice.client_id === profile.id}
              canManage={isStaff}
            />
          ) : null}

          {incident.client_id ? (
            <ChatPanel
              incidentId={id}
              kind="case"
              title={isClient ? t("chat.caseTitleClient") : t("chat.caseTitle")}
              messages={detail.caseMessages}
              meId={profile.id}
            />
          ) : null}
          {detail.groupMessages ? (
            <ChatPanel
              incidentId={id}
              kind="team"
              title={t("chat.teamTitle")}
              description={t("chat.teamSub")}
              messages={detail.groupMessages}
              meId={profile.id}
            />
          ) : null}
        </div>

        <div className={styles.column}>
          <CaseActions
            incidentId={id}
            actions={actions}
            urgency={incident.urgency}
            threshold={settings.threshold}
            incidentPoint={
              incident.lat !== null && incident.lng !== null
                ? { lat: incident.lat, lng: incident.lng }
                : null
            }
            technicians={technicians}
            scheduledAt={intervention?.scheduled_at ?? null}
          />
          <Card title={t("detail.timeline")}>
            <CaseTimeline status={incident.status} />
          </Card>
        </div>
      </div>
    </div>
  );
}
