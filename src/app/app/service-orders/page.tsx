import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { ChainProgress } from "@/components/service-orders/ChainProgress";
import { ServiceOrderForm } from "@/components/service-orders/ServiceOrderForm";
import { STATUS_TONE } from "@/components/service-orders/tones";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import type { ServiceOrderRow } from "@/lib/db/types";
import { openCaseOptions } from "@/lib/cases/queries";
import { createClient } from "@/lib/supabase/server";
import { waitingFor } from "@/lib/workflows/approval-chain";
import { SERVICE_ORDER_CHAIN, SERVICE_ORDER_ROLES } from "@/lib/workflows/service-order";
import styles from "@/components/service-orders/service-orders.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("serviceOrders"))("title") };
}

/** Service orders: drafted by the office, approved in sequence, signed, sent. */
export default async function ServiceOrdersPage() {
  const profile = await requireRole(SERVICE_ORDER_ROLES);
  const [t, format] = await Promise.all([getTranslations("serviceOrders"), getFormatter()]);
  const isOffice = ["manager", "director", "admin"].includes(profile.role);
  const { data } = await (
    await createClient()
  )
    .from("ai_conductor_service_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const orders: ServiceOrderRow[] = data ?? [];
  const mine = waitingFor(SERVICE_ORDER_CHAIN, profile.role);
  const waiting = orders.filter((o) => mine.includes(o.status));
  const others = orders.filter((o) => !mine.includes(o.status));
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const day = (d: string) => format.dateTime(new Date(d), { dateStyle: "medium" });

  const list = (rows: ServiceOrderRow[]) => (
    <ul className={styles.list}>
      {rows.map((o) => (
        <li key={o.id} data-order={o.reference}>
          <Card>
            <div className={styles.item}>
              <div className={styles.head}>
                <div>
                  <Link href={`/app/service-orders/${o.id}`}>
                    {o.reference} · {o.title}
                  </Link>
                  <p className={styles.meta}>
                    {o.supplier_name} · {t("from", { start: day(o.start_date) })} ·{" "}
                    {eur(Number(o.total_ttc))} {t("ttc")}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[o.status]}>{t(`status.${o.status}`)}</Badge>
              </div>
              <ChainProgress status={o.status} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="stack">
      <LiveRefresh channel="service-orders" tables={[{ table: "ai_conductor_service_orders" }]} />
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
        {isOffice ? <ServiceOrderForm cases={await openCaseOptions()} /> : null}
      </div>
      {waiting.length ? (
        <section className="stack" aria-labelledby="so-waiting">
          <h2 id="so-waiting" className={styles.section}>
            {t("waiting", { count: waiting.length })}
          </h2>
          {list(waiting)}
        </section>
      ) : null}
      {others.length ? (
        <section className="stack" aria-labelledby="so-all">
          <h2 id="so-all" className={styles.section}>
            {waiting.length ? t("others") : t("all")}
          </h2>
          {list(others)}
        </section>
      ) : null}
      {!orders.length ? (
        <Card>
          <EmptyState
            icon={<ClipboardList />}
            title={t("empty")}
            text={isOffice ? t("emptyOffice") : undefined}
          />
        </Card>
      ) : null}
    </div>
  );
}
