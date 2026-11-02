import Link from "next/link";
import type { Types } from "mongoose";
import { lastLogDates, formatDateTime } from "@/components/clients/data";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { formatDay } from "@/lib/dates";
import { requireCoach } from "@/lib/session";
import { CheckIn, CLIENT_STATUSES, ClientProfile, CoachingSession, User, type ClientStatus } from "@/models";
import { addClient } from "./actions";

export const metadata = { title: "Clients" };

type ClientRow = {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  lastLoginAt?: Date;
  status: ClientStatus;
  onboardedAt?: Date;
};

const FILTERS = [{ value: "", label: "Current" }, ...CLIENT_STATUSES.map((s) => ({ value: s, label: s })), { value: "all", label: "All" }];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  await requireCoach();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim().slice(0, 100);
  const rawStatus = one(sp.status);
  const status = rawStatus === "all" || (CLIENT_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "";
  const error = one(sp.error);

  const search = q ? { $or: [{ name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") }] } : {};
  const statusMatch = status === "all" ? {} : status ? { status } : { status: { $ne: "archived" } };

  // Clients joined with their profile. Users without a profile count as "onboarding".
  const clients = await User.aggregate<ClientRow>([
    { $match: { role: "client", ...search } },
    { $lookup: { from: ClientProfile.collection.name, localField: "_id", foreignField: "user", as: "profile" } },
    { $set: { profile: { $first: "$profile" } } },
    { $set: { status: { $ifNull: ["$profile.status", "onboarding"] }, onboardedAt: "$profile.onboarding.completedAt" } },
    { $match: statusMatch },
    { $project: { name: 1, email: 1, lastLoginAt: 1, status: 1, onboardedAt: 1 } },
    { $sort: { name: 1, email: 1 } },
    { $limit: 500 },
  ]).collation({ locale: "en", strength: 2 }); // case-insensitive name sort

  const ids = clients.map((c) => c._id);
  const [checkIns, lastLogs, sessions] = await Promise.all([
    CheckIn.aggregate<{ _id: Types.ObjectId; weekOf: string; reviewedAt?: Date }>([
      { $match: { client: { $in: ids } } },
      { $sort: { client: 1, weekOf: -1 } },
      { $group: { _id: "$client", weekOf: { $first: "$weekOf" }, reviewedAt: { $first: "$reviewedAt" } } },
    ]),
    lastLogDates(ids),
    CoachingSession.aggregate<{ _id: Types.ObjectId; startsAt: Date; title: string }>([
      { $match: { client: { $in: ids }, status: "scheduled", startsAt: { $gte: new Date() } } },
      { $sort: { startsAt: 1 } },
      { $group: { _id: "$client", startsAt: { $first: "$startsAt" }, title: { $first: "$title" } } },
    ]),
  ]);
  const checkInBy = new Map(checkIns.map((c) => [c._id.toString(), c]));
  const sessionBy = new Map(sessions.map((s) => [s._id.toString(), s]));

  const filterHref = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/clients?${s}` : "/clients";
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Clients ({clients.length})</h1>

      <div className="space-y-3">
        <nav className="flex gap-1 overflow-x-auto text-sm" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              aria-current={status === f.value ? "page" : undefined}
              className={`rounded-full px-3 py-1 whitespace-nowrap capitalize ${
                status === f.value ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form action="/clients" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search name or email" className="input" type="search" />
          <button className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="card divide-y divide-slate-100 p-0">
        {clients.length === 0 && <p className="p-5 text-sm text-slate-500">No clients match.</p>}
        {clients.map((c) => {
          const id = c._id.toString();
          const checkIn = checkInBy.get(id);
          const lastLog = lastLogs.get(id);
          const next = sessionBy.get(id);
          return (
            <Link key={id} href={`/clients/${id}`} className="block px-5 py-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{c.name || c.email}</p>
                <StatusBadge status={c.status} />
                {!c.onboardedAt && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">not onboarded</span>
                )}
                {!c.lastLoginAt && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">hasn&apos;t signed in</span>
                )}
              </div>
              <p className="text-sm text-slate-500">{c.email}</p>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <dt className="inline text-slate-400">Check-in: </dt>
                  <dd className="inline">
                    {checkIn ? (
                      <>
                        week of {formatDay(checkIn.weekOf)}{" "}
                        {checkIn.reviewedAt ? (
                          <span className="text-emerald-700">· reviewed</span>
                        ) : (
                          <span className="font-medium text-amber-700">· needs review</span>
                        )}
                      </>
                    ) : (
                      "none yet"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-400">Last log: </dt>
                  <dd className="inline">{lastLog ? formatDay(lastLog) : "never"}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-400">Next call: </dt>
                  <dd className="inline">{next ? formatDateTime(next.startsAt) : "none scheduled"}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Add client</h2>
        <p className="text-sm text-slate-500">
          Pre-register someone by email. When they sign in with Google (or dev login) using this same email address,
          they are linked to this account automatically and see their onboarding.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form action={addClient} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="name" required maxLength={200} placeholder="Name" className="input" aria-label="Name" />
          <input name="email" type="email" required placeholder="Email" className="input" aria-label="Email" />
          <button className="btn">Add client</button>
        </form>
      </section>
    </div>
  );
}
