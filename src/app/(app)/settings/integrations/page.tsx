import { requireClient } from "@/lib/session";
import { ClientProfile } from "@/models";
import { CRONOMETER_MAX_BYTES } from "@/lib/integrations/cronometer";
import { removeHevyKey } from "./actions";
import { CronometerUploadForm, HevyKeyForm, HevySyncForm } from "./forms";

export const metadata = { title: "Connections" };

export default async function IntegrationsPage() {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id })
    .select("+integrations.hevyApiKey timeZone integrations")
    .lean();
  // The key itself never leaves the server; the page only learns whether one is stored.
  const hevyConnected = Boolean(profile?.integrations?.hevyApiKey);
  const timeZone = profile?.timeZone || "UTC";
  const fmt = (d?: Date | null) =>
    d
      ? new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(d)
      : "never";

  return (
    <div className="space-y-6">
      <h1 className="page-title">Connections</h1>
      <p className="-mt-4 text-sm text-slate-600">
        Bring your workouts and meals in from other apps so your coach sees everything in one place.
      </p>

      <section className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Hevy</h2>
            <p className="text-sm text-slate-600">Imports your workouts (exercises, sets, weights).</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              hevyConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {hevyConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        {hevyConnected && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Last sync: {fmt(profile?.integrations?.hevyLastSyncAt)}</p>
            <HevySyncForm />
          </div>
        )}

        <HevyKeyForm connected={hevyConnected} />

        {hevyConnected && (
          <form action={removeHevyKey}>
            <button className="btn-danger">Remove key</button>
          </form>
        )}

        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">Where do I find my key?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>The Hevy API needs a Hevy Pro subscription.</li>
            <li>
              Open{" "}
              <a href="https://hevy.com/settings?developer" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                hevy.com/settings?developer
              </a>{" "}
              on the web and sign in.
            </li>
            <li>Generate an API key, copy it, and paste it above.</li>
          </ol>
          <p className="mt-2">The first sync imports the last 90 days; later syncs pick up new and edited workouts.</p>
        </details>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Cronometer</h2>
          <p className="text-sm text-slate-600">
            Cronometer has no public API, so upload its CSV export. Each diary group (Breakfast, Lunch, Dinner, Snacks)
            becomes one meal with its calories and macros. Re-uploading the same days updates them instead of adding
            duplicates.
          </p>
          <p className="mt-1 text-xs text-slate-500">Last import: {fmt(profile?.integrations?.cronometerLastImportAt)}</p>
        </div>
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">How to export from Cronometer</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Open{" "}
              <a href="https://cronometer.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                cronometer.com
              </a>{" "}
              in a browser (export is web only).
            </li>
            <li>Go to More → Account → Account Data → Export Data.</li>
            <li>Pick a date range (e.g. last 30 days).</li>
            <li>
              Click <strong>Export Food &amp; Recipe Entries</strong>. You get <code>servings.csv</code>.
            </li>
            <li>Upload that file here (max 1 MB; split long ranges).</li>
          </ol>
        </details>
        <CronometerUploadForm maxBytes={CRONOMETER_MAX_BYTES} />
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Excel / other trackers</h2>
        <p className="text-sm text-slate-600">
          Importing your coach’s Excel progress tracker comes next. We will build it once we have seen the real sheet
          layout, so the columns map correctly. Until then, keep using your sheet; your coach shares a sample
          (anonymised) with the app team as described in <code className="text-xs">docs/brain-dump/README.md</code>.
        </p>
      </section>
    </div>
  );
}
