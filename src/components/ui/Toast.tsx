"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import styles from "./Toast.module.css";

type ToastTone = "success" | "error";
type ToastItem = { id: number; tone: ToastTone; message: string };
type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);
const DURATION_MS = 5000;

export function ToastProvider({
  closeLabel,
  children,
}: {
  closeLabel: string;
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );

  const show = useCallback<ShowToast>(
    (message, tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all, { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.viewport} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            {toast.tone === "success" ? (
              <CircleCheck aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label={closeLabel}>
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used within ToastProvider");
  return show;
}
