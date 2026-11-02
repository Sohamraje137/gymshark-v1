import { isValidObjectId } from "mongoose";
import { CheckIn } from "@/models";
import { reviewCheckIn } from "./actions";
import { CheckInDetails, weekLabel, weightDeltas } from "./CheckInDetails";

/**
 * Coach-facing list of a client's weekly check-ins, with a feedback form per check-in.
 * Rendered on /clients/[clientId], which checks coach auth. Owned by the check-ins feature.
 */
export async function ClientCheckIns({ clientId }: { clientId: string }) {
  if (!isValidObjectId(clientId)) return null;
  const checkIns = await CheckIn.find({ client: clientId }).sort({ weekOf: -1 }).limit(52).lean();
  if (checkIns.length === 0) return <p className="text-sm text-slate-500">No check-ins yet.</p>;

  // Deltas are computed in chronological order, then unreviewed check-ins move to the top.
  const deltas = weightDeltas(checkIns);
  const rows = checkIns
    .map((c, i) => ({ c, delta: deltas[i] }))
    .sort((a, b) => Number(!!a.c.reviewedAt) - Number(!!b.c.reviewedAt));

  return (
    <div className="space-y-4">
      {rows.map(({ c, delta }) => {
        const id = c._id.toString();
        return (
          <article
            key={id}
            className={`card space-y-4 ${c.reviewedAt ? "" : "border-amber-300 bg-amber-50/40 ring-1 ring-amber-200"}`}
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{weekLabel(c.weekOf)}</h3>
              {c.reviewedAt ? (
                <span className="text-xs text-slate-500">Reviewed {c.reviewedAt.toLocaleDateString()}</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Needs review
                </span>
              )}
            </header>

            <CheckInDetails checkIn={c} weightDelta={delta} showFeedback={false} />

            <form action={reviewCheckIn} className="space-y-2 border-t border-slate-100 pt-4">
              <input type="hidden" name="checkInId" value={id} />
              <label className="block text-xs font-medium text-slate-600">
                Feedback for the client
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={5000}
                  defaultValue={c.coachFeedback ?? ""}
                  placeholder="What went well, what to change next week…"
                  className="input mt-1"
                />
              </label>
              <button className={c.reviewedAt ? "btn-secondary" : "btn"}>
                {c.reviewedAt ? "Update feedback" : "Save & mark reviewed"}
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
