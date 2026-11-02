"use client";

import { useEffect } from "react";

/** Registers public/sw.js so the app is installable and has an offline fallback. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("Service worker registration failed", err));
    }
  }, []);
  return null;
}
