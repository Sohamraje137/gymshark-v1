import { NextRequest } from "next/server";
import { handlers } from "@/auth";

/**
 * `next dev` reports every request URL as http://localhost:3000, even when the browser opened 127.0.0.1 or a LAN IP.
 * Auth.js builds its redirects from that URL, so signing in on another host set the cookie there but redirected to
 * localhost (signed out). Without AUTH_URL, rebuild the URL from the Host header so redirects stay on the same host.
 */
function withRequestHost(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (process.env.AUTH_URL || !host) return req;
  const url = new URL(req.url);
  url.host = host;
  url.protocol = req.headers.get("x-forwarded-proto") ?? url.protocol;
  return new NextRequest(url, req);
}

export const GET = (req: NextRequest) => handlers.GET(withRequestHost(req));
export const POST = (req: NextRequest) => handlers.POST(withRequestHost(req));
