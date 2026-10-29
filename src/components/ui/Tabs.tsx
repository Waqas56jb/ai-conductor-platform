"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export type TabItem = { id: string; label: string; content: ReactNode };

/** WAI-ARIA tabs with arrow / Home / End navigation (automatic activation). */
export function Tabs({
  items,
  label,
  defaultIndex = 0,
}: {
  items: readonly TabItem[];
  label: string;
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(defaultIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = items.length - 1;
    const next = (
      { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last } as Record<
        string,
        number
      >
    )[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const index = next < 0 ? last : next > last ? 0 : next;
    setActive(index);
    tabRefs.current[index]?.focus();
  }

  return (
    <div>
      <div className={styles.list} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={active === i}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={active === i ? 0 : -1}
            className={`${styles.tab} ${active === i ? styles.active : ""}`}
            onClick={() => setActive(i)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={active !== i}
          className={styles.panel}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
