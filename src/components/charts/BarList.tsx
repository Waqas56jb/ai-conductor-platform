import styles from "./charts.module.css";

/**
 * Horizontal bars for a few ordered categories (one series): label, bar,
 * value at the tip. Plain HTML, so it reflows at any width and every value
 * is printed: no tooltip needed.
 */
export function BarList({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; value: number; display: string; detail?: string }[];
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ul className={styles.bars} aria-label={title}>
      {rows.map((r) => (
        <li key={r.key} data-bucket={r.key}>
          <span className={styles.barLabel}>
            {r.label}
            {r.detail ? <span className={styles.barDetail}>{r.detail}</span> : null}
          </span>
          <span className={styles.barTrack}>
            <span
              className={styles.bar}
              // The value sits at the tip: the longest bar leaves room for it.
              style={{
                width: max
                  ? `calc((100% - 7rem) * ${r.value ? Math.max(r.value / max, 0.015) : 0})`
                  : 0,
              }}
            />
            <strong className={styles.barValue}>{r.display}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}
