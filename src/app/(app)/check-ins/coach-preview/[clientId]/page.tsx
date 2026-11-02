// TEMPORARY render test for ClientCheckIns. Delete before finishing.
import { ClientCheckIns } from "@/components/checkins/ClientCheckIns";
import { requireCoach } from "@/lib/session";

export default async function Preview({ params }: { params: Promise<{ clientId: string }> }) {
  await requireCoach();
  const { clientId } = await params;
  return <div className="mx-auto max-w-3xl"><h1 className="page-title">Check-ins (preview)</h1><ClientCheckIns clientId={clientId} /></div>;
}
