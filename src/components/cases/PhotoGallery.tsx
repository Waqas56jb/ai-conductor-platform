import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui";
import type { PhotoRef } from "@/lib/db/types";
import styles from "./cases.module.css";

/** Signed URLs expire after an hour; the page re-signs them on every render. */
export async function PhotoGallery({
  photos,
  urls,
}: {
  photos: PhotoRef[];
  urls: Record<string, string>;
}) {
  const t = await getTranslations("cases.detail");
  if (!photos.length) return <p className={styles.muted}>{t("noPhotos")}</p>;
  return (
    <ul className={styles.gallery}>
      {photos.map((photo, i) =>
        urls[photo.path] ? (
          <li key={photo.path}>
            <figure>
              <a href={urls[photo.path]} target="_blank" rel="noreferrer">
                {/* Signed, short-lived URLs: next/image optimisation would cache them. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[photo.path]} alt={`${t("photos")} ${i + 1}`} loading="lazy" />
              </a>
              <figcaption>
                <Badge tone={photo.kind === "site" ? "info" : "neutral"}>
                  {photo.kind === "site" ? t("photoSite") : t("photoReport")}
                </Badge>
              </figcaption>
            </figure>
          </li>
        ) : null,
      )}
    </ul>
  );
}
