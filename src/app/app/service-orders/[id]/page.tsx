import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/cases/LiveRefresh";
import { ChainProgress } from "@/components/service-orders/ChainProgress";
import { ServiceOrderActions } from "@/components/service-orders/ServiceOrderActions";
import { ServiceOrderForm } from "@/components/service-orders/ServiceOrderForm";
import { STATUS_TONE } from "@/components/service-orders/tones";
import { Badge, Card } from "@/components/ui";
import { parisDay } from "@/lib/accounting/ledger";
import { requireRole } from "@/lib/auth/session";
import { openCaseOptions } from "@/lib/cases/queries";
import { esignConfigured } from "@/lib/esign/signatures";
import { createClient } from "@/lib/supabase/server";
import { decide } from "@/lib/workflows/approval-chain";
import {
  COMMITTED_STATUSES,
  fundsCheck,
  SERVICE_ORDER_CHAIN,
  SERVICE_ORDER_ROLES,
} from "@/lib/workflows/service-order";
import styles from "@/components/service-orders/service-orders.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { data } = await (
    await createClient()
  )
    .from("ai_conductor_service_orders")
    .select("reference")
    .eq("id", (await params).id)
    .maybeSingle();
  return { title: data?.reference ?? (await getTranslations("serviceOrders"))("title") };
}

export default async function ServiceOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(SERVICE_ORDER_ROLES);
  const { id } = await params;
  const [t, format] = await Promise.all([getTranslations("serviceOrders"), getFormatter()]);
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("ai_conductor_service_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const year = Number(parisDay(new Date()).slice(0, 4));
  const showFunds = ["funds_check", "accountant_review"].includes(order.status);
  const [{ data: steps }, { data: incident }, funds] = await Promise.all([
    supabase
      .from("ai_conductor_approval_steps")
      .select("*")
      .eq("entity_type", "service_order")
      .eq("entity_id", id)
      .order("created_at"),
    order.incident_id
      ? supabase
          .from("ai_conductor_incidents")
          .select("id, reference, title")
          .eq("id", order.incident_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    showFunds ? fundsOf(year, order.id, Number(order.total_ttc)) : Promise.resolve(null),
  ]);
  const actorIds = [...new Set((steps ?? []).flatMap((s) => (s.actor_id ? [s.actor_id] : [])))];
  const { data: actors } = actorIds.length
    ? await supabase.from("ai_conductor_users").select("id, display_name, email").in("id", actorIds)
    : { data: [] };
  const names = new Map((actors ?? []).map((a) => [a.id, a.display_name || a.email]));

  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  const day = (d: string) => format.dateTime(new Date(d), { dateStyle: "medium" });
  const can = (d: "submit" | "approve" | "sign" | "cancel") =>
    decide(SERVICE_ORDER_CHAIN, order.status, d, { role: profile.role, note: "-" }).ok;
  const isOffice = ["manager", "director", "admin"].includes(profile.role);

  return (
    <div className="stack">
      <LiveRefresh
        channel={`service-order-${id}`}
        tables={[{ table: "ai_conductor_service_orders" }]}
      />
      <div className="page-header">
        <div>
          <p className={styles.meta}>
            <Link href="/app/service-orders">{t("title")}</Link>
          </p>
          <h1>
            {order.reference} · {order.title}
          </h1>
        </div>
        <Badge tone={STATUS_TONE[order.status]}>{t(`status.${order.status}`)}</Badge>
      </div>

      <Card>
        <div className={styles.item}>
          <ChainProgress status={order.status} />
          <ServiceOrderActions
            id={order.id}
            reference={order.reference}
            status={order.status}
            can={{
              submit: can("submit"),
              approve: can("approve"),
              sign: can("sign"),
              cancel: can("cancel"),
            }}
            esignConfigured={esignConfigured()}
          />
          {isOffice && order.status === "draft" ? (
            <div>
              <ServiceOrderForm
                id={order.id}
                cases={await openCaseOptions()}
                initial={{
                  title: order.title,
                  description: order.description,
                  supplierName: order.supplier_name,
                  supplierEmail: order.supplier_email,
                  supplierSiret: order.supplier_siret ?? "",
                  incidentId: order.incident_id ?? "",
                  startDate: order.start_date,
                  endDate: order.end_date ?? "",
                  amountHt: String(order.amount_ht),
                  taxRate: String(Number(order.tax_rate)),
                }}
              />
            </div>
          ) : null}
        </div>
      </Card>

      {funds ? (
        <Card title={t("funds.title")} description={t("funds.sub", { year })}>
          <dl className={styles.funds} data-testid="funds-check">
            <div>
              <dt>{t("funds.collected")}</dt>
              <dd>{eur(funds.collected)}</dd>
            </div>
            <div>
              <dt>{t("funds.committed")}</dt>
              <dd>− {eur(funds.committed)}</dd>
            </div>
            <div className={styles.total}>
              <dt>{t("funds.available")}</dt>
              <dd>{eur(funds.available)}</dd>
            </div>
            <div>
              <dt>{t("funds.thisOrder")}</dt>
              <dd>− {eur(Number(order.total_ttc))}</dd>
            </div>
            <div className={styles.total}>
              <dt>{t("funds.after")}</dt>
              <dd>{eur(funds.after)}</dd>
            </div>
          </dl>
          <p className={styles.verdict} data-ok={funds.sufficient}>
            {funds.sufficient ? (
              <CircleCheck aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
            {funds.sufficient ? t("funds.sufficient") : t("funds.insufficient")}
          </p>
        </Card>
      ) : null}

      <Card title={t("details")}>
        <dl className={styles.facts}>
          <div>
            <dt>{t("fields.supplierName")}</dt>
            <dd>{order.supplier_name}</dd>
          </div>
          <div>
            <dt>{t("fields.supplierEmail")}</dt>
            <dd>{order.supplier_email}</dd>
          </div>
          {order.supplier_siret ? (
            <div>
              <dt>{t("fields.supplierSiret")}</dt>
              <dd>{order.supplier_siret}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t("period")}</dt>
            <dd>
              {order.end_date
                ? t("between", { start: day(order.start_date), end: day(order.end_date) })
                : t("from", { start: day(order.start_date) })}
            </dd>
          </div>
          <div>
            <dt>{t("amounts")}</dt>
            <dd data-testid="order-total">
              {eur(Number(order.amount_ht))} {t("ht")} ·{" "}
              {t("vat", { rate: Number(order.tax_rate) })} ·{" "}
              <strong>
                {eur(Number(order.total_ttc))} {t("ttc")}
              </strong>
            </dd>
          </div>
          {incident ? (
            <div>
              <dt>{t("fields.case")}</dt>
              <dd>
                <Link href={`/app/cases/${incident.id}`}>
                  {incident.reference} · {incident.title}
                </Link>
              </dd>
            </div>
          ) : null}
          {order.sent_at ? (
            <div>
              <dt>{t("sentOn")}</dt>
              <dd>{day(order.sent_at)}</dd>
            </div>
          ) : null}
        </dl>
        {order.description ? <p className={styles.description}>{order.description}</p> : null}
      </Card>

      <Card title={t("history")}>
        <ol className={styles.history}>
          <li>
            <strong>{t("decisions.created")}</strong>
            <time dateTime={order.created_at}>
              {format.dateTime(new Date(order.created_at), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </li>
          {(steps ?? []).map((s) => (
            <li key={s.id} data-decision={s.decision}>
              <strong>
                {t(`decisions.${s.decision}`, { step: t(`status.${s.from_status}`) })}
                {" — "}
                {(s.actor_id && names.get(s.actor_id)) || t("someone")}
              </strong>
              <time dateTime={s.created_at}>
                {format.dateTime(new Date(s.created_at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              {s.note ? <q>{s.note}</q> : null}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/** Collected this year minus what other orders already commit, against this order. */
async function fundsOf(year: number, orderId: string, amount: number) {
  const supabase = await createClient();
  const [{ data: payments }, { data: committed }] = await Promise.all([
    supabase
      .from("ai_conductor_payments")
      .select("amount")
      .eq("status", "verified")
      .gte("paid_at", `${year}-01-01T00:00:00+01:00`)
      .lt("paid_at", `${year + 1}-01-01T00:00:00+01:00`),
    supabase
      .from("ai_conductor_service_orders")
      .select("total_ttc")
      .in("status", [...COMMITTED_STATUSES])
      .neq("id", orderId)
      .gte("created_at", `${year}-01-01T00:00:00+01:00`),
  ]);
  return fundsCheck({
    collected: (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
    committed: (committed ?? []).reduce((s, o) => s + Number(o.total_ttc), 0),
    amount,
  });
}
