import { COOKIE } from "@/lib/session";

export async function GET() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/passcode",
      "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}
