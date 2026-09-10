import { COOKIE, expiredCookieHeader } from "@/lib/session";

export async function GET() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/scan",
      "Set-Cookie": expiredCookieHeader(COOKIE),
    },
  });
}
