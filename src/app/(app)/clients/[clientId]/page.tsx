import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { ClientCheckIns } from "@/components/checkins/ClientCheckIns";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { ClientLogsSummary } from "@/components/logs/ClientLogsSummary";
import { ClientSessions } from "@/components/sessions/ClientSessions";
import { requireCoach } from "@/lib/session";
import { CLIENT_STATUSES, ClientProfile, User } from "@/models";
import { setClientStatus } from "../actions";
import { NotesTab } from "./NotesTab";
import { OverviewTab } from "./OverviewTab";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "logs", label: "Logs" },
  { value: "check-ins", label: "Check-ins" },
  { value: "sessions", label: "Sessions" },
  { value: "notes", label: "Notes" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export async function generateMetadata({ params }: PageProps<"/clients/[clientId]">) {
  await requireCoach();
  const { clientId } = await params;
  if (!isValidObjectId(clientId)) return { title: "Client" };
  const person = await User.findOne({ _id: clientId, role: "client" }, "name email").lean();
  return { title: person?.name || person?.email || "Client" };
}

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[clientId]">) {
  await requireCoach();
  const { clientId } = await params;
  if (!isValidObjectId(clientId)) notFound();
  const [person, profile] = await Promise.all([
    User.findOne({ _id: clientId, role: "client" }, "name email lastLoginAt").lean(),
    ClientProfile.findOne({ user: clientId }, "status").lean(),
  ]);
  if (!person) notFound();

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const tab: Tab = TABS.find((t) => t.value === one(sp.tab))?.value ?? "overview";
  const error = one(sp.error);
  const status = profile?.status ?? "onboarding";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-indigo-600 hover:underline">
          ← Clients
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{person.name || person.email}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm break-all text-slate-500">{person.email}</p>
            <p className="text-xs text-slate-400">
              {person.lastLoginAt ? `Last signed in ${person.lastLoginAt.toLocaleDateString()}` : "Hasn't signed in yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={setClientStatus.bind(null, clientId)} className="flex items-center gap-2">
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <select id="status" name="status" defaultValue={status} className="input w-auto py-1.5 capitalize">
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="btn-secondary">Set status</button>
            </form>
            <Link href={`/messages/${clientId}`} className="btn">
              Message
            </Link>
          </div>
        </div>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 text-sm sm:mx-0 sm:px-0" aria-label="Client sections">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/clients/${clientId}?tab=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 whitespace-nowrap ${
              tab === t.value
                ? "border-indigo-600 font-medium text-indigo-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {tab === "overview" && <OverviewTab clientId={clientId} />}
      {tab === "logs" && <ClientLogsSummary clientId={clientId} />}
      {tab === "check-ins" && <ClientCheckIns clientId={clientId} />}
      {tab === "sessions" && <ClientSessions clientId={clientId} />}
      {tab === "notes" && <NotesTab clientId={clientId} />}
    </div>
  );
}
