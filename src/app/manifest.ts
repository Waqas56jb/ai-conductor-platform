import type { MetadataRoute } from "next";

/** Installable app (PWA): opens straight on the dashboard, full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Pratonna",
    short_name: "Pratonna",
    description: "Votre collaboratrice pour l’immobilier, le syndic et le BTP.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#060b1e",
    theme_color: "#060b1e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
