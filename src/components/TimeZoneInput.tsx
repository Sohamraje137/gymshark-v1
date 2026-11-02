"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Hidden form field carrying the browser's IANA time zone (e.g. "America/New_York"). */
export function TimeZoneInput() {
  const tz = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "", // server render: unknown until hydrated
  );
  return <input type="hidden" name="timeZone" value={tz} />;
}
