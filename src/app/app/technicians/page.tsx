import type { Metadata } from "next";
import { HardHat, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TechnicianMapLazy } from "@/components/cases/TechnicianMapLazy";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { listTechnicians } from "@/lib/cases/queries";
import styles from "../team.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("technicians"))("title") };
}

export default async function TechniciansPage() {
  await requireRole(["manager", "director", "admin"]);
  const [t, techs] = await Promise.all([getTranslations("technicians"), listTechnicians()]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("sub")}</p>
        </div>
      </div>
      {techs.length ? (
        <>
          <Card title={t("map")}>
            <TechnicianMapLazy
              label={t("map")}
              points={techs
                .filter((tech) => tech.lat !== null && tech.lng !== null)
                .map((tech) => ({
                  id: tech.id,
                  lat: tech.lat as number,
                  lng: tech.lng as number,
                  label: tech.display_name,
                  kind: "technician" as const,
                  selected: tech.available,
                }))}
            />
          </Card>
          <ul className={styles.grid}>
            {techs.map((tech) => (
              <li key={tech.id} className={styles.card}>
                <div className={styles.head}>
                  <strong>{tech.display_name}</strong>
                  <Badge tone={tech.available ? "success" : "warning"}>
                    {tech.available ? t("available") : t("unavailable")}
                  </Badge>
                </div>
                <p className={styles.muted}>{tech.specialty ?? "—"}</p>
                <p className={styles.muted}>
                  {t("experience", { years: tech.experience_years ?? 0 })} ·{" "}
                  {t("jobs", { count: tech.jobs_completed ?? 0 })}
                  {tech.rating ? ` · ★ ${Number(tech.rating).toFixed(1)}` : ""}
                </p>
                <p className={styles.place}>
                  <MapPin aria-hidden="true" />
                  {tech.city ?? t("noLocation")}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Card>
          <EmptyState icon={<HardHat />} title={t("empty")} />
        </Card>
      )}
    </div>
  );
}
