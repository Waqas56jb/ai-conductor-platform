"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import styles from "./charts.module.css";

export type Series = {
  key: string;
  label: string;
  /** Index into the chart palette (fixed per entity, never by rank). */
  slot: 1 | 2 | 3;
};

const HEIGHT = 240;
const M = { top: 12, right: 8, bottom: 28, left: 56 };
const BAR_MAX = 24;
const GAP = 2;
const RADIUS = 4;

/** Clean upper bound and ticks (0, 1 000, 2 000…). */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Column with a rounded data end and a square foot on the baseline. */
function column(x: number, y: number, w: number, h: number, round: boolean) {
  if (h <= 0) return "";
  const r = round ? Math.min(RADIUS, w / 2, h) : 0;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Columns per category, grouped (side by side) or stacked. Hover or focus a
 * category for its values; every value is also in the table below.
 */
export function ColumnChart({
  title,
  categories,
  series,
  values,
  stacked = false,
  unit,
}: {
  title: string;
  categories: string[];
  /** Long names of the categories, for the tooltip and the table. */
  series: Series[];
  /** values[category][series] */
  values: number[][];
  stacked?: boolean;
  unit: "eur" | "count";
}) {
  const t = useTranslations("reports.chart");
  const format = useFormatter();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.max(260, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fmt = (n: number) =>
    unit === "eur"
      ? format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
      : format.number(n);
  const tick = (n: number) =>
    unit === "eur"
      ? format.number(n, { notation: "compact", maximumFractionDigits: 1 })
      : String(n);

  const totals = values.map((v) => (stacked ? v.reduce((s, x) => s + x, 0) : Math.max(...v)));
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks.at(-1)!;
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const band = plotW / categories.length;
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const groupW = stacked
    ? Math.min(BAR_MAX, band * 0.6)
    : Math.min(BAR_MAX * series.length + GAP * (series.length - 1), band * 0.72);
  const barW = stacked ? groupW : (groupW - GAP * (series.length - 1)) / series.length;
  const compactLabels = band < 34;

  return (
    <figure className={styles.figure}>
      {series.length > 1 ? (
        <ul className={styles.legend}>
          {series.map((s) => (
            <li key={s.key}>
              <span className={styles.swatch} data-slot={s.slot} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={box} className={styles.plot} onPointerLeave={() => setActive(null)}>
        <svg width={width} height={HEIGHT} role="img" aria-label={title}>
          {ticks.map((v) => (
            <g key={v}>
              <line
                className={v === 0 ? styles.baseline : styles.grid}
                x1={M.left}
                x2={width - M.right}
                y1={y(v)}
                y2={y(v)}
              />
              <text className={styles.tick} x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
                {tick(v)}
              </text>
            </g>
          ))}
          {categories.map((c, i) => {
            const x0 = M.left + band * i + (band - groupW) / 2;
            let acc = 0;
            const last = stacked ? values[i].findLastIndex((v) => v > 0) : -1;
            return (
              <g key={c} data-active={active === i || undefined} className={styles.category}>
                {series.map((s, j) => {
                  const v = values[i][j];
                  if (stacked) {
                    const yTop = y(acc + v);
                    // 2px surface gap between stacked segments.
                    const h = y(acc) - yTop - (acc > 0 ? GAP : 0);
                    acc += v;
                    return (
                      <path
                        key={s.key}
                        className={styles.mark}
                        data-slot={s.slot}
                        d={column(x0, yTop, barW, h, j === last)}
                      />
                    );
                  }
                  const yTop = y(v);
                  return (
                    <path
                      key={s.key}
                      className={styles.mark}
                      data-slot={s.slot}
                      d={column(x0 + j * (barW + GAP), yTop, barW, y(0) - yTop, true)}
                    />
                  );
                })}
                <text
                  className={styles.tick}
                  x={M.left + band * i + band / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                >
                  {compactLabels ? c.slice(0, 1).toUpperCase() : c}
                </text>
                {/* Hit target: the whole band, bigger than the marks. */}
                <rect
                  className={styles.hit}
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={plotH}
                  tabIndex={0}
                  aria-label={`${c} : ${series.map((s, j) => `${s.label} ${fmt(values[i][j])}`).join(", ")}`}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
        {active !== null ? (
          <div
            className={styles.tooltip}
            role="status"
            data-testid="chart-tooltip"
            style={{
              left: Math.min(Math.max(M.left + band * active + band / 2, 80), width - 80),
            }}
          >
            <span className={styles.tipTitle}>{categories[active]}</span>
            {series.map((s, j) => (
              <span key={s.key} className={styles.tipRow}>
                <span className={styles.lineKey} data-slot={s.slot} aria-hidden="true" />
                <strong>{fmt(values[active][j])}</strong>
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <details className={styles.data}>
        <summary>{t("table")}</summary>
        <table>
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t("period")}</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c}>
                <th scope="row">{c}</th>
                {series.map((s, j) => (
                  <td key={s.key}>{fmt(values[i][j])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
