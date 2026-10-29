import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, EmptyState, buttonClass } from "@/components/ui";

export default async function AppNotFound() {
  const t = await getTranslations("errors");
  return (
    <Card>
      <EmptyState
        icon={<SearchX />}
        title={t("notFoundTitle")}
        text={t("notFoundText")}
        action={
          <Link href="/app" className={buttonClass({ variant: "secondary" })}>
            {t("backHome")}
          </Link>
        }
      />
    </Card>
  );
}
