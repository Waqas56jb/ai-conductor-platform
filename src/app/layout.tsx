import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: { default: "Pratonna", template: "%s — Pratonna" },
  description: "L’agent IA des PME de l’immobilier, du syndic et du BTP.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060b1e",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body>
        <NextIntlClientProvider>
          <ToastProvider closeLabel={t("close")}>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
