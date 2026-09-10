import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { hospitalAttendance, hospitalAttendanceStats } from "@/lib/queries";
import { actionDate, currentMonthIso, formatMonthTitle, isoDateValue, minutesToHm } from "@/lib/dates";
import { attendanceExportPath } from "@/lib/report-csv";
import { IconCalendar, IconCheck, IconClock, IconDownload, IconXCircle } from "@/components/icons";

export default async function MyHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const month = currentMonthIso();
  const staff = session.user_id!;
  const requestedPage = Number(params.page || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = 5;
  const offset = (page - 1) * limit;
  let rows: Awaited<ReturnType<typeof hospitalAttendance>> = [];
  let total = 0;
  let summary: Awaited<ReturnType<typeof hospitalAttendanceStats>> | null = null;

  try {
    const result = await withDb(async (db) => {
      const stats = await hospitalAttendanceStats(db, session.company_id, staff, undefined, month);
      const rows = await hospitalAttendance(db, session.company_id, offset, limit, staff, undefined, month);
      return { rows, total: stats.total, summary: stats };
    });
    rows = result.rows;
    total = result.total;
    summary = result.summary;
  } catch (error) {
    console.error("[hours]", error);
  }

  const csvHref = attendanceExportPath({ staff, month, format: "csv" });
  const excelHref = attendanceExportPath({ staff, month, format: "excel" });
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My hours</h1>
            <p className="text-sm text-slate-500">
              {session.first} {session.last} · {formatMonthTitle(month)}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={csvHref}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <IconDownload size={16} /> CSV
            </a>
            <a
              href={excelHref}
              className="inline-flex items-center gap-1 rounded-xl bg-[#fff4ea] px-3 py-2 text-sm font-semibold text-[#d98324] hover:bg-[#ff8002] hover:text-white"
            >
              <IconDownload size={16} /> Excel
            </a>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-green-800">
              <IconCheck size={16} /> Present
            </p>
            <p className="mt-1 text-3xl font-bold text-green-900">{Number(summary?.total_present ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-red-800">
              <IconXCircle size={16} /> Open / void
            </p>
            <p className="mt-1 text-3xl font-bold text-red-900">{Number(summary?.total_absent ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-[#fff4ea] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-[#d98324]">
              <IconClock size={16} /> Hours this month
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{minutesToHm(Number(summary?.total_minutes ?? 0))}</p>
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-500">
          {total} shift{total === 1 ? "" : "s"} this month. Showing up to {limit} per page.
        </p>
        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">In</th>
                <th className="px-3 py-3">Out</th>
                <th className="px-3 py-3">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No shifts recorded this month yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1">
                        <IconCalendar size={14} />
                        {isoDateValue(row.attendance_date ?? row.check_in_time)}
                      </span>
                    </td>
                    <td className="px-3 py-3">{actionDate(row.check_in_time)}</td>
                    <td className="px-3 py-3">
                      {row.check_out_time ? actionDate(row.check_out_time) : <span className="text-red-600">Open</span>}
                    </td>
                    <td className="px-3 py-3">{row.hours_worked ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <nav className="mt-5 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              prefetch={false}
              href={`/hours?page=${page - 1}`}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              Previous
            </Link>
          ) : null}
          <span className="px-3 py-1.5 text-sm text-slate-600">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link
              prefetch={false}
              href={`/hours?page=${page + 1}`}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              Next
            </Link>
          ) : null}
        </nav>
      </div>
    </main>
  );
}
