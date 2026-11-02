import {
  CheckInDetails,
  RATINGS,
  weekLabel,
  weightDeltas,
  type CheckInView,
} from "@/components/checkins/CheckInDetails";
import { mondayOf, todayIn } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { CheckIn, ClientProfile } from "@/models";
import { submitCheckIn } from "./actions";

export const metadata = { title: "Check-ins" };

export default async function CheckInsPage() {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id }, "timeZone").lean();
  const weekOf = mondayOf(todayIn(profile?.timeZone || "UTC"));

  const checkIns = await CheckIn.find({ client: user._id }).sort({ weekOf: -1 }).limit(52).lean();
  const deltas = weightDeltas(checkIns);
  const currentIndex = checkIns.findIndex((c) => c.weekOf === weekOf);
  const current = currentIndex >= 0 ? checkIns[currentIndex] : null;
  const history = checkIns.map((c, i) => ({ c, delta: deltas[i] })).filter(({ c }) => c.weekOf !== weekOf);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="page-title mb-1">Weekly check-in</h1>
        <p className="text-sm text-slate-500">{weekLabel(weekOf)}</p>
      </div>

      {current?.reviewedAt ? (
        <section className="card space-y-3">
          <p className="text-sm text-slate-600">Your coach has reviewed this week&apos;s check-in.</p>
          <CheckInDetails checkIn={current} weightDelta={deltas[currentIndex]} />
        </section>
      ) : (
        <CheckInForm checkIn={current} />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Past check-ins</h2>
        {history.length === 0 && <p className="text-sm text-slate-500">No past check-ins yet.</p>}
        {history.map(({ c, delta }) => (
          <article key={c._id.toString()} className="card space-y-3">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{weekLabel(c.weekOf)}</h3>
              <span className="text-xs text-slate-500">
                {c.reviewedAt ? "Reviewed by your coach" : "Awaiting review"}
              </span>
            </header>
            <CheckInDetails checkIn={c} weightDelta={delta} />
          </article>
        ))}
      </section>
    </div>
  );
}

function CheckInForm({ checkIn }: { checkIn: CheckInView | null }) {
  return (
    <form action={submitCheckIn} className="card space-y-5">
      {checkIn && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Submitted. You can edit it until your coach reviews it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-600">
          Weight (kg)
          <input
            type="number"
            name="weightKg"
            inputMode="decimal"
            step="0.1"
            min={30}
            max={300}
            defaultValue={checkIn?.weightKg ?? ""}
            className="input mt-1"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Waist (cm)
          <input
            type="number"
            name="waistCm"
            inputMode="decimal"
            step="0.1"
            min={40}
            max={200}
            defaultValue={checkIn?.waistCm ?? ""}
            className="input mt-1"
          />
        </label>
      </div>

      <div className="space-y-4">
        {RATINGS.map((r) => (
          <fieldset key={r.name}>
            <legend className="flex w-full justify-between text-xs font-medium text-slate-600">
              <span>{r.label}</span>
              <span className="font-normal text-slate-400">
                1 {r.low} · 5 {r.high}
              </span>
            </legend>
            <div className="mt-1 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input
                    type="radio"
                    name={r.name}
                    value={n}
                    required
                    defaultChecked={checkIn?.[r.name] === n}
                    className="peer sr-only"
                  />
                  <span className="flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 hover:bg-slate-50 peer-checked:hover:bg-indigo-700">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {(
        [
          { name: "wins", label: "Wins this week", placeholder: "What went well?" },
          { name: "struggles", label: "Struggles", placeholder: "What was hard?" },
          { name: "questions", label: "Questions for your coach", placeholder: "Anything you want to ask?" },
        ] as const
      ).map((f) => (
        <label key={f.name} className="block text-xs font-medium text-slate-600">
          {f.label}
          <textarea
            name={f.name}
            rows={3}
            maxLength={3000}
            placeholder={f.placeholder}
            defaultValue={checkIn?.[f.name] ?? ""}
            className="input mt-1"
          />
        </label>
      ))}

      <button className="btn w-full sm:w-auto">{checkIn ? "Update check-in" : "Submit check-in"}</button>
    </form>
  );
}
