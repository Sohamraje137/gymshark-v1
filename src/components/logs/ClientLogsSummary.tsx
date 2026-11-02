/**
 * Coach-facing summary of a client's recent meals, workouts and activities.
 * Rendered on /clients/[clientId]. Owned by the client-logging feature.
 */
export async function ClientLogsSummary({ clientId }: { clientId: string }) {
  void clientId;
  return <p className="text-sm text-slate-500">Logs summary coming soon.</p>;
}
