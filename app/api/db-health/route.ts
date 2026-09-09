import { probeDb } from "@/lib/db";

export async function GET() {
  const result = await probeDb();
  return Response.json(result, { status: result.ok ? 200 : 503 });
}
