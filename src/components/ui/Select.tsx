"use client";

import { useId, type SelectHTMLAttributes } from "react";
import styles from "./Field.module.css";

export type SelectOption = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  placeholder?: string;
};

export function Select({ label, options, error, placeholder, id, className = "", ...rest }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={`${styles.control} ${styles.select} ${error ? styles.invalid : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className={styles.error} id={`${selectId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
