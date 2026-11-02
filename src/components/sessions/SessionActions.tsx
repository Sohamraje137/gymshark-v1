"use client";

import { useActionState, useState } from "react";
import {
  cancelSession,
  completeSession,
  rescheduleSession,
  type SessionActionState,
} from "@/app/(app)/schedule/actions";
import { TimeZoneInput } from "@/components/TimeZoneInput";
import { toZonedInputValue } from "@/lib/dates";
import { DURATIONS, type SessionStatus } from "./constants";
import { useBrowserTimeZone } from "./useBrowserTimeZone";

/** Coach-only buttons on a call: reschedule, mark completed (with private outcome), cancel. */
export function SessionActions({
  sessionId,
  status,
  startsAt,
  endsAt,
  outcome,
}: {
  sessionId: string;
  status: SessionStatus;
  startsAt: string;
  endsAt: string;
  outcome?: string;
}) {
  const tz = useBrowserTimeZone();
  const [open, setOpen] = useState<"reschedule" | "complete" | null>(null);
  const [message, setMessage] = useState<SessionActionState>(null);

  // Each wrapper shows the result and closes the panel on success.
  const [, rescheduleAction, reschedulePending] = useActionState(
    async (prev: SessionActionState, fd: FormData) => {
      const res = await rescheduleSession(sessionId, prev, fd);
      setMessage(res);
      if (res?.ok) setOpen(null);
      return res;
    },
    null,
  );
  const [, completeAction, completePending] = useActionState(async (prev: SessionActionState, fd: FormData) => {
    const res = await completeSession(sessionId, prev, fd);
    setMessage(res);
    if (res?.ok) setOpen(null);
    return res;
  }, null);
  const [, cancelAction, cancelPending] = useActionState(async () => {
    const res = await cancelSession(sessionId);
    setMessage(res);
    return res;
  }, null);

  const toggle = (panel: "reschedule" | "complete") => {
    setMessage(null);
    setOpen(open === panel ? null : panel);
  };
  const minutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000);
  const duration = (DURATIONS as readonly number[]).includes(minutes) ? minutes : 30;
  // Stay mounted (keeps a cancel warning visible) but render nothing for a cancelled call.
  if (status === "cancelled" && !message) return null;

  return (
    <div className="mt-3 space-y-3">
      {status === "scheduled" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => toggle("reschedule")} aria-expanded={open === "reschedule"}>
            Reschedule
          </button>
          <button type="button" className="btn-secondary" onClick={() => toggle("complete")} aria-expanded={open === "complete"}>
            Complete
          </button>
          <form action={cancelAction}>
            <button
              className="btn-danger"
              disabled={cancelPending}
              onClick={(e) => {
                if (!confirm("Cancel this call?")) e.preventDefault();
              }}
            >
              {cancelPending ? "Cancelling…" : "Cancel call"}
            </button>
          </form>
        </div>
      )}
      {status === "completed" && (
        <button type="button" className="btn-secondary" onClick={() => toggle("complete")} aria-expanded={open === "complete"}>
          {outcome ? "Edit outcome" : "Add outcome"}
        </button>
      )}

      {open === "reschedule" && (
        <form action={rescheduleAction} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block text-xs font-medium text-slate-600">
            New start
            <input
              type="datetime-local"
              name="start"
              required
              defaultValue={tz ? toZonedInputValue(new Date(startsAt), tz) : undefined}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Duration
            <select name="duration" defaultValue={duration} className="input mt-1">
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>
          <TimeZoneInput />
          <button className="btn" disabled={reschedulePending}>
            {reschedulePending ? "Saving…" : "Save new time"}
          </button>
        </form>
      )}

      {open === "complete" && (
        <form action={completeAction} className="space-y-2 rounded-lg bg-slate-50 p-3">
          <label className="block text-xs font-medium text-slate-600">
            Outcome (private: only you see this)
            <textarea
              name="outcome"
              rows={3}
              maxLength={5000}
              defaultValue={outcome}
              placeholder="What did you agree on?"
              className="input mt-1"
            />
          </label>
          <button className="btn" disabled={completePending}>
            {completePending ? "Saving…" : status === "completed" ? "Save outcome" : "Mark completed"}
          </button>
        </form>
      )}

      {message?.error && <p className="text-sm text-red-600" role="alert">{message.error}</p>}
      {message?.warning && <p className="text-sm text-amber-700" role="status">{message.warning}</p>}
      {message?.ok && !message.warning && <p className="text-sm text-emerald-700" role="status">{message.ok}</p>}
    </div>
  );
}
