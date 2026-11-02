import type { ClientStatus } from "@/models";

const STYLES: Record<ClientStatus, string> = {
  onboarding: "bg-indigo-100 text-indigo-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-600",
};

/** Small pill showing a client's coaching status. */
export function StatusBadge({ status }: { status: ClientStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{status}</span>;
}
