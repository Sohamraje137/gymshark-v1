import Link from "next/link";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { CoachDashboard } from "@/components/dashboard/CoachDashboard";
import { requireUser } from "@/lib/session";
import { ClientProfile } from "@/models";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "coach") return <CoachDashboard user={user} />;

  const profile = await ClientProfile.findOne({ user: user._id }, "onboarding.completedAt").lean();
  return (
    <div className="space-y-6">
      {!profile?.onboarding?.completedAt && (
        <Link href="/onboarding" className="card block border-indigo-200 bg-indigo-50 hover:border-indigo-400">
          <p className="font-semibold text-indigo-900">Finish your onboarding</p>
          <p className="text-sm text-indigo-800">Tell your coach about your goals, health and routine. It takes about 5 minutes.</p>
        </Link>
      )}
      <ClientDashboard user={user} />
    </div>
  );
}
