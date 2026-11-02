/**
 * Coach-facing list of a client's past and upcoming calls, with a "schedule call" form.
 * Rendered on /clients/[clientId]. Owned by the scheduling feature.
 */
export async function ClientSessions({ clientId }: { clientId: string }) {
  void clientId;
  return <p className="text-sm text-slate-500">Sessions coming soon.</p>;
}
