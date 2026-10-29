import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev badge sits bottom-left, over the sidebar's collapse button.
  // Build/runtime errors still open the dev overlay.
  devIndicators: false,
};

export default withNextIntl(nextConfig);
