import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { QuoteCard } from "@/components/cases/CaseSummaryCards";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { QuoteDecision } from "@/components/cases/QuoteDecision";
import styles from "@/components/cases/cases.module.css";
import { Card, EmptyState, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("quotes"))("title") };
}

export default async function QuotesPage() {
  const profile = await requireRole(["client"]);
  const t = await getTranslations("quotes");
  const supabase = await createClient();
  // Quotes still under internal review are not shown to the client.
  const { data } = await supabase
    .from("ai_conductor_quotations")
    .select("*")
    .eq("client_id", profile.id)
    .not("status", "in", "(pending_manager,pending_director)")
    .order("created_at", { ascending: false });
  const quotes = data ?? [];

  return (
    <div className="stack">
      <LiveRefresh channel="quotes" tables={[{ table: "ai_conductor_quotations" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      {quotes.length ? (
        quotes.map((quote) => (
          <div key={quote.id} className={styles.stack}>
            <QuoteCard quote={quote} showDiagnosis={false} />
            <div className={styles.row}>
              {quote.status === "sent_to_client" && quote.incident_id ? (
                <QuoteDecision incidentId={quote.incident_id} />
              ) : null}
              {quote.incident_id ? (
                <Link
                  href={`/app/cases/${quote.incident_id}`}
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  {t("open")}
                </Link>
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <Card>
          <EmptyState icon={<FileText />} title={t("empty")} />
        </Card>
      )}
    </div>
  );
}
