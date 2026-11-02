import { APP_NAME } from "@/lib/site";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-slate-600">
        {APP_NAME} needs an internet connection. Reconnect and try again.
      </p>
    </main>
  );
}
