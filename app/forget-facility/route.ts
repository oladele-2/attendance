import { COOKIE, FACILITY_COOKIE, expiredCookieHeader } from "@/lib/session";

export async function GET() {
  const headers = new Headers();
  headers.set("Location", "/passcode?reset=1");
  headers.append("Set-Cookie", expiredCookieHeader(COOKIE));
  headers.append("Set-Cookie", expiredCookieHeader(FACILITY_COOKIE));
  return new Response(null, { status: 303, headers });
}
