import { getTranslations } from "next-intl/server";
import { SERVICE_ORDER_CHAIN, type ServiceOrderStatus } from "@/lib/workflows/service-order";
import styles from "./service-orders.module.css";

const FLOW: ServiceOrderStatus[] = [...SERVICE_ORDER_CHAIN.steps.map((s) => s.status), "sent"];

/** Where the order is in draft → funds_check → accountant_review → esign → sent. */
export async function ChainProgress({ status }: { status: ServiceOrderStatus }) {
  const t = await getTranslations("serviceOrders.status");
  const at = FLOW.indexOf(status);
  return (
    <ol className={styles.chain} aria-label={t("label")}>
      {FLOW.map((s, i) => {
        const state =
          status === "cancelled"
            ? "upcoming"
            : i < at || status === "sent"
              ? "done"
              : i === at
                ? "current"
                : "upcoming";
        return (
          <li key={s} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span>{t(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
