import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

type Props = { title: string; text?: string; icon?: ReactNode; action?: ReactNode };

export function EmptyState({ title, text, icon, action }: Props) {
  return (
    <div className={styles.empty}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className={styles.title}>{title}</p>
      {text ? <p className={styles.text}>{text}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
