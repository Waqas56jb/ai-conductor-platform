import type { ReactNode } from "react";
import styles from "./KpiTile.module.css";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "blue" | "cyan" | "violet" | "green";
};

export function KpiTile({ label, value, hint, icon, tone = "blue" }: Props) {
  return (
    <article className={`${styles.tile} ${styles[tone]}`}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </article>
  );
}
