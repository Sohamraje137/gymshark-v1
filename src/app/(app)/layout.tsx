import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { APP_NAME } from "@/lib/site";

// Navigation per role. Add new pages here.
const NAV = {
  coach: [
    { href: "/dashboard", label: "Home" },
    { href: "/clients", label: "Clients" },
    { href: "/schedule", label: "Schedule" },
    { href: "/messages", label: "Messages" },
    { href: "/announcements", label: "Announcements" },
    { href: "/videos", label: "Videos" },
    { href: "/calendar", label: "Calendar" },
    { href: "/access", label: "Access" },
  ],
  client: [
    { href: "/dashboard", label: "Home" },
    { href: "/log", label: "Log" },
    { href: "/check-ins", label: "Check-ins" },
    { href: "/sessions", label: "Sessions" },
    { href: "/messages", label: "Messages" },
    { href: "/announcements", label: "Announcements" },
    { href: "/videos", label: "Videos" },
    { href: "/settings/integrations", label: "Connections" },
  ],
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="mr-auto font-semibold text-indigo-600 sm:mr-0">
            {APP_NAME}
          </Link>
          {/* On phones the nav drops to its own scrollable row under the brand. */}
          <nav className="order-last -mx-2 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
            {NAV[user.role].map(
              (l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-2.5 py-1.5 whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {l.label}
                </Link>
              ),
            )}
          </nav>
          {user.image && (
            <Image
              src={user.image}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
              title={user.email}
            />
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="btn-secondary">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
