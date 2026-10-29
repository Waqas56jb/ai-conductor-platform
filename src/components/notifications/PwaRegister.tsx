"use client";

import { useEffect } from "react";

/** Registers the service worker: installable app, offline page, web push. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("[pwa] service worker not registered", e);
    });
  }, []);
  return null;
}
