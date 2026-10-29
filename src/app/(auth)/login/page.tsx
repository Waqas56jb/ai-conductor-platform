import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.login"))("submit") };
}

const NOTICES: Record<string, { key: string; tone: "error" | "success" }> = {
  link: { key: "auth.login.linkError", tone: "error" },
  "no-profile": { key: "auth.login.noProfile", tone: "error" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signedout?: string }>;
}) {
  const { next, error, signedout } = await searchParams;
  const notice = error
    ? NOTICES[error]
    : signedout
      ? { key: "auth.login.signedOut", tone: "success" as const }
      : undefined;
  return <LoginForm next={next} notice={notice} />;
}
