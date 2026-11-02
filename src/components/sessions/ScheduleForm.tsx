"use client";

import Link from "next/link";
import { useActionState } from "react";
import { scheduleCall, type ScheduleState } from "@/app/(app)/schedule/actions";
import { TimeZoneInput } from "@/components/TimeZoneInput";
import { DURATIONS, MAX_REPEAT_WEEKS, SESSION_TYPE_LABELS } from "./constants";

type FormState = ScheduleState & { n: number };

/**
 * "Schedule a call" form. With `fixedClient` the client is preselected (coach's client page).
 * Times are entered in the coach's browser time zone (sent as a hidden `timeZone` field).
 */
export function ScheduleForm({
  clients = [],
  fixedClient,
  googleConnected,
}: {
  clients?: { id: string; name: string }[];
  fixedClient?: { id: string; name: string };
  googleConnected: boolean;
}) {
  const [state, action, pending] = useActionState(
    async (prev: FormState, fd: FormData): Promise<FormState> => ({ ...(await scheduleCall(prev, fd)), n: prev.n + 1 }),
    { n: 0 },
  );
  // After an error the form re-mounts with what the coach typed; after success it starts empty.
  const v = state.values ?? {};

  return (
    <form key={state.n} action={action} className="card space-y-3">
      {fixedClient ? (
        <>
          <input type="hidden" name="clientId" value={fixedClient.id} />
          <p className="text-sm text-slate-600">
            With <span className="font-medium text-slate-900">{fixedClient.name}</span>
          </p>
        </>
      ) : (
        <label className="block text-xs font-medium text-slate-600">
          Client
          <select name="clientId" required defaultValue={v.clientId ?? ""} className="input mt-1">
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-xs font-medium text-slate-600">
        Type
        <select name="type" defaultValue={v.type || "weekly_checkin"} className="input mt-1">
          {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Title
        <input
          name="title"
          maxLength={200}
          defaultValue={v.title}
          placeholder="Defaults to type + client name"
          className="input mt-1"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Starts (your time)
        <input type="datetime-local" name="start" required defaultValue={v.start} className="input mt-1" />
      </label>
      <div className="grid grid-cols-2 items-end gap-2">
        <label className="block text-xs font-medium text-slate-600">
          Duration
          <select name="duration" defaultValue={v.duration || "30"} className="input mt-1">
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Repeat weekly (weeks)
          <input
            type="number"
            name="repeat"
            required
            min={1}
            max={MAX_REPEAT_WEEKS}
            defaultValue={v.repeat || "1"}
            className="input mt-1"
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Agenda
        <textarea name="agenda" rows={3} maxLength={5000} defaultValue={v.agenda} className="input mt-1" />
      </label>
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="createMeet"
            disabled={!googleConnected}
            defaultChecked={googleConnected && (state.values ? v.createMeet === "on" : true)}
            className="h-4 w-4 accent-indigo-600"
          />
          Create Google Meet link
        </label>
        {!googleConnected && (
          <p className="text-xs text-slate-500">
            <Link href="/calendar" className="text-indigo-600 hover:underline">
              Connect Google Calendar
            </Link>{" "}
            to auto-create Meet links.
          </p>
        )}
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Or paste a meeting link
        <input
          type="url"
          name="meetUrl"
          pattern="https://.*"
          maxLength={500}
          defaultValue={v.meetUrl}
          placeholder="https://zoom.us/j/…"
          className="input mt-1"
        />
      </label>
      <TimeZoneInput />
      <button className="btn w-full" disabled={pending}>
        {pending ? "Scheduling…" : "Schedule call"}
      </button>
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700" role="status">{state.ok}</p>}
      {state.warnings?.map((w) => (
        <p key={w} className="text-sm text-amber-700" role="status">
          {w}
        </p>
      ))}
    </form>
  );
}
