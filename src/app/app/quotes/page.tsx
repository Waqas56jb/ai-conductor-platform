import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { QuoteCard } from "@/components/cases/CaseSummaryCards";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { QuoteSignature } from "@/components/cases/QuoteSignature";
import styles from "@/components/cases/cases.module.css";
import { Card, EmptyState, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { esignConfigured } from "@/lib/esign/signatures";
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
  // Latest signature request per quote (RLS: the signer's own).
  const { data: requests } = quotes.length
    ? await supabase
        .from("ai_conductor_signature_requests")
        .select("id, status, document_id")
        .eq("document_type", "quotation")
        .in(
          "document_id",
          quotes.map((q) => q.id),
        )
        .order("created_at", { ascending: false })
    : { data: [] };
  const signatureOf = (quoteId: string) => requests?.find((r) => r.document_id === quoteId) ?? null;
  const configured = esignConfigured();

  return (
    <div className="stack">
      <LiveRefresh
        channel="quotes"
        tables={[
          { table: "ai_conductor_quotations" },
          { table: "ai_conductor_signature_requests", filter: `signer_id=eq.${profile.id}` },
        ]}
      />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      {quotes.length ? (
        quotes.map((quote) => (
          <div key={quote.id} className={styles.stack} data-quote={quote.reference}>
            <QuoteCard quote={quote} showDiagnosis={false} />
            <div className={styles.row}>
              {quote.incident_id ? (
                <QuoteSignature
                  quoteId={quote.id}
                  incidentId={quote.incident_id}
                  configured={configured}
                  signable={quote.status === "sent_to_client"}
                  signature={signatureOf(quote.id)}
                />
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
