import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Remove the inner padding (e.g. for a full-bleed table). */
  flush?: boolean;
};

export function Card({
  title,
  description,
  actions,
  flush = false,
  className = "",
  children,
  ...rest
}: Props) {
  const hasHeader = title || description || actions;
  return (
    <section className={`${styles.card} ${className}`} {...rest}>
      {hasHeader ? (
        <header className={styles.header}>
          <div>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? styles.flush : styles.body}>{children}</div>
    </section>
  );
}
