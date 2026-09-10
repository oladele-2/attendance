import { probeDb } from "@/lib/db";
import { sessionFromCookieHeader } from "@/lib/session";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const session = await sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session?.user_id || session.privilege !== "CEO") {
    return Response.json({ ok: false }, { status: 404, headers: PRIVATE_HEADERS });
  }

  const result = await probeDb();
  return Response.json(
    { ok: result.ok },
    { status: result.ok ? 200 : 503, headers: PRIVATE_HEADERS },
  );
}
