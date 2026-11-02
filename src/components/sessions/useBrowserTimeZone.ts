"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The browser's IANA time zone, or "" during server render and hydration (React then re-renders with the
 * real zone, so there is no hydration mismatch). Same approach as `TimeZoneInput`.
 */
export function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
}
