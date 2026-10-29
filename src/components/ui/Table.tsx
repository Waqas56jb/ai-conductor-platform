import type { ReactNode } from "react";
import styles from "./Table.module.css";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Right-align numeric columns. */
  align?: "start" | "end";
};

type Props<T> = {
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  caption: string;
  empty?: ReactNode;
};

/** On narrow screens each row becomes a card; cells keep their header as a label. */
export function Table<T>({ columns, rows, getRowKey, caption, empty }: Props<T>) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === "end" ? styles.end : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  className={col.align === "end" ? styles.end : undefined}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
