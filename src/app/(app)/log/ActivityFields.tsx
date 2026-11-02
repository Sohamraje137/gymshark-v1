"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_UNITS } from "./shared";

const label = (type: string) => type[0].toUpperCase() + type.slice(1);

/** Type / value / unit inputs for the activity form. Picking a type fills in its usual unit. */
export function ActivityFields({ types }: { types: readonly string[] }) {
  const [type, setType] = useState(types[0]);
  const [unit, setUnit] = useState(DEFAULT_UNITS[types[0]] ?? "");
  const select = useRef<HTMLSelectElement>(null);

  // React resets the form after a successful action; reset the controlled fields with it.
  useEffect(() => {
    const form = select.current?.form;
    if (!form) return;
    const onReset = () => {
      setType(types[0]);
      setUnit(DEFAULT_UNITS[types[0]] ?? "");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [types]);

  return (
    <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
      <label className="text-xs text-slate-500">
        Type
        <select
          ref={select}
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setUnit(DEFAULT_UNITS[e.target.value] ?? "");
          }}
          className="input mt-0.5"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Amount
        <input
          name="value"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          required
          placeholder={type === "steps" ? "8000" : ""}
          className="input mt-0.5"
        />
      </label>
      <label className="text-xs text-slate-500">
        Unit
        <input
          name="unit"
          maxLength={20}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="input mt-0.5"
        />
      </label>
    </div>
  );
}
