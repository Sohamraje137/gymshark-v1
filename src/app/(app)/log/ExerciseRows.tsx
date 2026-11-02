"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, type ExerciseRowInput } from "./shared";

type Row = { key: number; name: string; sets: string; reps: string; weight: string };

let nextKey = 0;
const emptyRow = (): Row => ({ key: nextKey++, name: "", sets: "", reps: "", weight: "" });

const toNumber = (s: string) => (s.trim() === "" ? undefined : Number(s));

/**
 * Exercise rows for the workout form. The visible inputs have no `name`; the rows are sent
 * as JSON in the hidden `exercises` input and validated by the server action.
 */
export function ExerciseRows() {
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const hidden = useRef<HTMLInputElement>(null);

  // React resets the form after a successful action; clear the rows with it.
  useEffect(() => {
    const form = hidden.current?.form;
    if (!form) return;
    const onReset = () => setRows([emptyRow()]);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload: ExerciseRowInput[] = rows
    .filter((r) => r.name.trim())
    .map((r) => ({ name: r.name.trim(), sets: toNumber(r.sets) ?? 1, reps: toNumber(r.reps), weightKg: toNumber(r.weight) }));

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-medium text-slate-600">Exercises</legend>
      <input ref={hidden} type="hidden" name="exercises" value={JSON.stringify(payload)} />
      {rows.map((r, i) => (
        <div key={r.key} className="space-y-1.5 rounded-lg border border-slate-200 p-2">
          <div className="flex gap-2">
            <input
              aria-label={`Exercise ${i + 1} name`}
              placeholder="Exercise, e.g. Back squat"
              maxLength={100}
              value={r.name}
              onChange={(e) => update(r.key, { name: e.target.value })}
              className="input"
            />
            {rows.length > 1 && (
              <button
                type="button"
                aria-label={`Remove exercise ${i + 1}`}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                className="btn-danger px-2"
              >
                ✕
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-500">
              Sets
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={LIMITS.setsPerExercise}
                step={1}
                placeholder="1"
                value={r.sets}
                onChange={(e) => update(r.key, { sets: e.target.value })}
                className="input mt-0.5"
              />
            </label>
            <label className="text-xs text-slate-500">
              Reps
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={LIMITS.reps}
                step={1}
                value={r.reps}
                onChange={(e) => update(r.key, { reps: e.target.value })}
                className="input mt-0.5"
              />
            </label>
            <label className="text-xs text-slate-500">
              kg
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={LIMITS.weightKg}
                step="any"
                value={r.weight}
                onChange={(e) => update(r.key, { weight: e.target.value })}
                className="input mt-0.5"
              />
            </label>
          </div>
        </div>
      ))}
      {rows.length < LIMITS.exercises && (
        <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="btn-secondary w-full">
          + Add exercise
        </button>
      )}
    </fieldset>
  );
}
