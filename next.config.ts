import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
  // The PDF reads the logo from disk: ship it with the functions that render it.
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf": ["./public/brand/logo-color.png"],
    "/app/quotes": ["./public/brand/logo-color.png"],
    "/app/cases/[id]": ["./public/brand/logo-color.png"],
  },
};

export default withNextIntl(nextConfig);
