import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/site";

export default async function Home({ searchParams }: PageProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-600">{APP_DESCRIPTION}</p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error === "AccessDenied"
              ? "Your account does not have access. Contact an admin."
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
    </main>
  );
}
