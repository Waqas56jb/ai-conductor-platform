import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, buttonClass } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.checkEmail"))("title") };
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  const t = await getTranslations("auth.checkEmail");
  return (
    <EmptyState
      icon={<MailCheck />}
      title={t("title")}
      text={t("body", { email })}
      action={
        <Link href="/login" className={buttonClass({ variant: "secondary" })}>
          {t("back")}
        </Link>
      }
    />
  );
}
