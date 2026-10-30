"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui";
import type { Recommendation } from "@/lib/recommendations";
import { useAssistant } from "./AssistantProvider";
import styles from "./WelcomeCard.module.css";

/** What deserves attention, each one handed to the assistant with a prefilled task. */
export function RecommendationsCard({ items }: { items: Recommendation[] }) {
  const t = useTranslations("recommendations");
  const { openPanel } = useAssistant();
  if (!items.length) return null;
  return (
    <Card title={t("title")} description={t("description")}>
      <ul className={styles.recos}>
        {items.map((r) => (
          <li key={r.key} data-testid={`reco-${r.key}`}>
            <Lightbulb aria-hidden="true" />
            <span>{t(`${r.key}.text`, { count: r.count, example: r.example })}</span>
            <button
              type="button"
              className={styles.handle}
              onClick={() => openPanel(t(`${r.key}.prompt`, { example: r.example }))}
            >
              {t("handle")}
              <ArrowRight aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
