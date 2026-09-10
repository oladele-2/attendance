import { withDb } from "@/lib/db";
import { hospitalAttendance } from "@/lib/queries";
import { attendanceCsv } from "@/lib/report-csv";
import { sessionFromCookieHeader } from "@/lib/session";

function parseStaff(raw: string | null, admin: boolean, selfId?: number) {
  if (!admin) return selfId;
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

export async function GET(request: Request) {
  const session = await sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session?.company_id || !session.user_id) {
    return new Response("Sign in to export a report.", { status: 401 });
  }

  const url = new URL(request.url);
  const admin = session.privilege === "CEO" || session.privilege === "Admin";
  const staff = parseStaff(url.searchParams.get("staff"), admin, session.user_id);
  const month = url.searchParams.get("month") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const date = month || from || to ? undefined : url.searchParams.get("date") || undefined;
  const excel = url.searchParams.get("format") === "excel";

  const rows = await withDb((db) =>
    hospitalAttendance(db, session.company_id, 0, 8000, staff, date, month, from, to),
  );

  const body = attendanceCsv(rows);
  const stamp = month || date || (from || to ? `${from || "start"}-to-${to || "now"}` : "all");
  const filename = `attendance-${stamp}.${excel ? "xls" : "csv"}`;

  return new Response(body, {
    headers: {
      "Content-Type": excel ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
