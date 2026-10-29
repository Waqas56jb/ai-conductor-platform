import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Table, type Column } from "@/components/ui";
import type { CaseListItem } from "@/lib/cases/queries";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";
import styles from "./cases.module.css";

export async function CaseTable({
  cases,
  caption,
  empty,
}: {
  cases: CaseListItem[];
  caption: string;
  empty: React.ReactNode;
}) {
  const [t, format] = await Promise.all([getTranslations("cases.columns"), getFormatter()]);

  const columns: Column<CaseListItem>[] = [
    {
      key: "case",
      header: t("case"),
      render: (c) => (
        <Link href={`/app/cases/${c.id}`} className={styles.caseLink}>
          <strong>{c.title}</strong>
          <span className={styles.ref}>{c.reference}</span>
        </Link>
      ),
    },
    { key: "address", header: t("address"), render: (c) => c.building_address ?? "—" },
    { key: "status", header: t("status"), render: (c) => <StatusBadge status={c.status} /> },
    { key: "urgency", header: t("urgency"), render: (c) => <UrgencyBadge urgency={c.urgency} /> },
    {
      key: "created",
      header: t("created"),
      render: (c) => format.dateTime(new Date(c.created_at), { dateStyle: "short" }),
    },
  ];

  return (
    <Table caption={caption} columns={columns} rows={cases} getRowKey={(c) => c.id} empty={empty} />
  );
}
