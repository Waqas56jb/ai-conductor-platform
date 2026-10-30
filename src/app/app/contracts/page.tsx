import type { Metadata } from "next";
import { FileSignature } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { ContractActions, NewContractButton } from "@/components/contracts/ContractActions";
import { Badge, Card, EmptyState, type BadgeTone } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import type { ContractRow } from "@/lib/db/types";
import { esignConfigured } from "@/lib/esign/signatures";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/contracts/contracts.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("contracts"))("title") };
}

const TONE: Record<ContractRow["status"], BadgeTone> = {
  draft: "neutral",
  sent: "info",
  signed: "success",
  cancelled: "danger",
};

/** Contracts: the office drafts and sends them, the client signs with DocuSign. */
export default async function ContractsPage() {
  const profile = await requireRole(["client", "manager", "director", "admin", "accountant"]);
  const [t, format] = await Promise.all([getTranslations("contracts"), getFormatter()]);
  const supabase = await createClient();
  const isOffice = ["manager", "director", "admin"].includes(profile.role);
  // RLS: clients only ever read their own contracts.
  const [{ data }, { data: clients }] = await Promise.all([
    supabase
      .from("ai_conductor_contracts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    isOffice
      ? supabase
          .from("ai_conductor_users")
          .select("id, display_name, email")
          .eq("role", "client")
          .eq("active", true)
          .order("display_name")
      : Promise.resolve({ data: [] }),
  ]);
  const contracts = data ?? [];
  const names = new Map((clients ?? []).map((c) => [c.id, c.display_name || c.email]));
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const day = (d: string) => format.dateTime(new Date(d), { dateStyle: "medium" });
  const configured = esignConfigured();

  return (
    <div className="stack">
      <LiveRefresh channel="contracts" tables={[{ table: "ai_conductor_signature_requests" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{isOffice ? t("subOffice") : t("sub")}</p>
        </div>
        {isOffice ? (
          <NewContractButton
            clients={(clients ?? []).map((c) => ({ id: c.id, name: c.display_name || c.email }))}
          />
        ) : null}
      </div>
      {contracts.length ? (
        <ul className={styles.list}>
          {contracts.map((c) => (
            <li key={c.id} data-contract={c.reference}>
              <Card>
                <div className={styles.head}>
                  <div>
                    <strong>
                      {c.reference} · {c.title}
                    </strong>
                    <p className={styles.meta}>
                      {isOffice ? `${names.get(c.client_id) ?? "—"} · ` : ""}
                      {c.end_date
                        ? t("period", { start: day(c.start_date), end: day(c.end_date) })
                        : t("from", { start: day(c.start_date) })}
                      {" · "}
                      {t(`billing.${c.billing}`)} · {eur(Number(c.total_ttc))} {t("ttc")}
                    </p>
                  </div>
                  <Badge tone={TONE[c.status]}>{t(`status.${c.status}`)}</Badge>
                </div>
                <ContractActions
                  id={c.id}
                  reference={c.reference}
                  status={c.status}
                  role={isOffice ? "office" : profile.role === "client" ? "client" : "viewer"}
                  esignConfigured={configured}
                />
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={<FileSignature />}
            title={t("empty")}
            text={isOffice ? t("emptyOffice") : undefined}
          />
        </Card>
      )}
    </div>
  );
}
