import { createRequire } from "node:module";
import { dirname, relative } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// pdfkit (under @react-pdf) loads its standard fonts with a runtime require the
// bundler cannot follow: find its real folder in the pnpm store.
const require = createRequire(import.meta.url);
const from = (pkg: string, base: string) =>
  dirname(require.resolve(`${pkg}/package.json`, { paths: [base] }));
const reactPdfFont = from("@react-pdf/font", from("@react-pdf/renderer", process.cwd()));
// pdfkit exports no package.json: resolve its entry (js/pdfkit.js), two levels up.
const pdfkit = relative(
  process.cwd(),
  dirname(dirname(require.resolve("pdfkit", { paths: [reactPdfFont] }))),
).replaceAll("\\", "/");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev badge sits bottom-left, over the sidebar's collapse button.
  // Build/runtime errors still open the dev overlay.
  devIndicators: false,
  // Photos and receipts are uploaded through server actions (resized client-side;
  // the server also caps each file at 10 MB).
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
  // Quote PDFs are rendered on the server (DocuSign envelopes, downloads).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Browsers ask for /favicon.ico on their own; the app icon is /icon.png.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.png" }];
  },
  // PDFs read the logo and pdfkit's standard fonts from disk at run time:
  // files the bundler cannot see, so ship them with every route that renders one.
  outputFileTracingIncludes: Object.fromEntries(
    [
      "/api/quotes/[id]/pdf",
      "/api/documents/[kind]/[id]",
      "/app/quotes",
      "/app/cases/[id]",
      "/app/contracts",
    ].map((route) => [
      route,
      [
        "./public/brand/logo-color.png",
        `./${pdfkit}/js/data/**`,
        `./${pdfkit}/js/standard-fonts/**`,
      ],
    ]),
  ),
};

export default withNextIntl(nextConfig);
