"use client";

import { useId, type InputHTMLAttributes } from "react";
import styles from "./Field.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  /** Shown after the label, e.g. "(optional)". */
  optionalLabel?: string;
};

export function Input({ label, hint, error, optionalLabel, id, className = "", ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = [hint ? `${inputId}-hint` : "", error ? `${inputId}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {optionalLabel ? <span className={styles.optional}> ({optionalLabel})</span> : null}
      </label>
      <input
        id={inputId}
        className={`${styles.control} ${error ? styles.invalid : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {hint && !error ? (
        <p className={styles.hint} id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
