"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card space-y-3">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600">{error.message || "Please try again."}</p>
      <button onClick={reset} className="btn">
        Try again
      </button>
    </div>
  );
}
