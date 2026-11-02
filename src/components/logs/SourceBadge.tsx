import { sourceLabel } from "./format";

/** Small "Hevy" / "Cronometer" badge for imported log entries. Renders nothing for manual ones. */
export function SourceBadge({ source }: { source?: string | null }) {
  const label = sourceLabel(source);
  if (!label) return null;
  return (
    <span className="ml-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide text-slate-600 uppercase">
      {label}
    </span>
  );
}
