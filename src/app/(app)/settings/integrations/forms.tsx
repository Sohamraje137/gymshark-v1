"use client";

import { useActionState, useState } from "react";
import { saveHevyKey, syncHevy, uploadCronometerCsv, type ActionState } from "./actions";

function Result({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <div aria-live="polite" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
      <p>{state.message}</p>
      {state.details && state.details.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
          {state.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HevyKeyForm({ connected }: { connected: boolean }) {
  const [state, action, pending] = useActionState(saveHevyKey, null);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="hevy-key" className="text-sm font-medium">
        {connected ? "Replace API key" : "API key"}
      </label>
      <div className="flex gap-2">
        <input
          id="hevy-key"
          name="apiKey"
          type="password"
          autoComplete="off"
          required
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="input"
        />
        <button className="btn shrink-0" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function HevySyncForm() {
  const [state, action, pending] = useActionState(syncHevy, null);
  return (
    <form action={action} className="space-y-2">
      <button className="btn" disabled={pending}>
        {pending ? "Syncing…" : "Sync now"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function CronometerUploadForm({ maxBytes }: { maxBytes: number }) {
  const [state, action, pending] = useActionState(uploadCronometerCsv, null);
  const [tooBig, setTooBig] = useState(false);
  return (
    <form action={action} className="space-y-2">
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="input"
        onChange={(e) => setTooBig((e.target.files?.[0]?.size ?? 0) > maxBytes)}
      />
      <button className="btn" disabled={pending || tooBig}>
        {pending ? "Importing…" : "Import CSV"}
      </button>
      {tooBig ? (
        <p className="text-sm text-red-600">File is larger than 1 MB. Export a shorter date range.</p>
      ) : (
        <Result state={state} />
      )}
    </form>
  );
}
