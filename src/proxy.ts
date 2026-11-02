// Runs Auth.js on every page request so the JWT session cookie keeps getting refreshed
// (sliding expiry). Real access checks happen in src/lib/session.ts.
export { auth as proxy } from "@/auth";

export const config = {
  // Skip static files, images, the service worker and the manifest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)"],
};
