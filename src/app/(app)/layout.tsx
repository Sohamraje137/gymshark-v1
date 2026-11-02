import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { APP_NAME } from "@/lib/site";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/announcements", label: "Announcements" },
  { href: "/messages", label: "Messages" },
  { href: "/calendar", label: "Calendar" },
  { href: "/videos", label: "Videos" },
];

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
            {[...links, ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])].map(
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
