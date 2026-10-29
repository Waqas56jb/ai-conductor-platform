import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CaseTable } from "@/components/cases/CaseTable";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import styles from "@/components/cases/cases.module.css";
import { Card, EmptyState, buttonClass } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { listCases } from "@/lib/cases/queries";
import { FINAL_STATUSES, INCIDENT_STATUSES } from "@/lib/workflows/incident";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("cases"))("listTitle") };
}

const FILTERS = ["open", "closed", "all"] as const;
type Filter = (typeof FILTERS)[number];
const OPEN = INCIDENT_STATUSES.filter((s) => !FINAL_STATUSES.includes(s));

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireProfile();
  const t = await getTranslations("cases");
  const raw = (await searchParams).filter;
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "open";
  const cases = await listCases({
    statuses: filter === "open" ? OPEN : filter === "closed" ? FINAL_STATUSES : undefined,
  });

  const isClient = profile.role === "client";
  const isTech = profile.role === "technician";
  const canCreate = isClient || ["manager", "director", "admin"].includes(profile.role);
  const title = isClient ? t("listTitleClient") : isTech ? t("listTitleTech") : t("listTitle");
  const emptyText = isClient ? t("emptyClient") : isTech ? t("emptyTech") : t("empty");
  const filterLabel = { open: t("filterOpen"), closed: t("filterClosed"), all: t("filterAll") };

  return (
    <div className="stack">
      <LiveRefresh channel="cases-list" tables={[{ table: "ai_conductor_incidents" }]} />
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{t("listSub")}</p>
        </div>
        {canCreate ? (
          <Link href="/app/cases/new" className={buttonClass()}>
            <Plus aria-hidden="true" />
            {isClient ? t("report.title") : t("newCase")}
          </Link>
        ) : null}
      </div>

      <nav className={styles.filters} aria-label={title}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/app/cases?filter=${f}`}
            className={styles.filter}
            aria-current={f === filter ? "page" : undefined}
          >
            {filterLabel[f]}
          </Link>
        ))}
      </nav>

      <Card flush>
        <CaseTable
          cases={cases}
          caption={title}
          empty={<EmptyState icon={<FolderOpen />} title={emptyText} />}
        />
      </Card>
    </div>
  );
}
