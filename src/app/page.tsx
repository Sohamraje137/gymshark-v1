import { redirect } from "next/navigation";
import { devLoginEnabled, signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/site";

const DEMO_USERS = [
  { email: "coach@demo.local", label: "Demo coach" },
  { email: "alex@demo.local", label: "Alex (active client)" },
  { email: "priya@demo.local", label: "Priya (new client)" },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  const needsPasscode = !!process.env.DEV_LOGIN_PASSCODE;

  async function devLogin(formData: FormData) {
    "use server";
    await signIn("dev-login", {
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
      passcode: formData.get("passcode"),
      redirectTo: "/dashboard",
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="card w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-600">{APP_DESCRIPTION}</p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error === "AccessDenied"
              ? "Your account does not have access. Contact your coach."
              : error === "CredentialsSignin"
                ? "Dev login failed. Check the email (and passcode)."
                : "Sign-in failed. Please try again."}
          </p>
        )}
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="btn w-full">Continue with Google</button>
        </form>
      </div>

      {devLoginEnabled && (
        <div className="card w-full max-w-sm border-dashed border-amber-300 bg-amber-50/50">
          <h2 className="font-semibold text-amber-900">Dev login</h2>
          <p className="mt-1 text-xs text-amber-800">
            Sign in without Google. Turn off with <code>DEV_LOGIN_ENABLED=false</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_USERS.map((u) => (
              <form key={u.email} action={devLogin}>
                <input type="hidden" name="email" value={u.email} />
                {needsPasscode && <input name="passcode" type="password" placeholder="Passcode" required className="input mb-1" />}
                <button className="btn-secondary">{u.label}</button>
              </form>
            ))}
          </div>
          <form action={devLogin} className="mt-4 space-y-2 border-t border-amber-200 pt-4">
            <input name="email" type="email" placeholder="any@email.com" required className="input" />
            <input name="name" placeholder="Name (new users)" className="input" />
            <select name="role" className="input" defaultValue="client">
              <option value="client">New user is a client</option>
              <option value="coach">New user is a coach</option>
            </select>
            {needsPasscode && <input name="passcode" type="password" placeholder="Passcode" required className="input" />}
            <button className="btn w-full">Sign in with email</button>
          </form>
          <p className="mt-2 text-xs text-amber-800">Demo users exist after running <code>npm run seed</code>.</p>
        </div>
      )}
    </main>
  );
}
