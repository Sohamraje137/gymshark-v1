/**
 * Coach-facing list of a client's weekly check-ins, with a feedback form per check-in.
 * Rendered on /clients/[clientId]. Owned by the check-ins feature.
 */
export async function ClientCheckIns({ clientId }: { clientId: string }) {
  void clientId;
  return <p className="text-sm text-slate-500">Check-ins coming soon.</p>;
}
