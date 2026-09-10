import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { withDb } from "@/lib/db";
import {
  facilityStaffOptions,
  hospitalAttendance,
  hospitalAttendanceStats,
} from "@/lib/queries";
import { actionDate, formatLongDate, formatMonthTitle, isoDateValue, minutesToHm } from "@/lib/dates";
import { isoDate } from "@/lib/dates";
import { attendanceExportPath } from "@/lib/report-csv";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { FlashBanner } from "@/components/FlashBanner";
import { StaffPicker } from "@/components/StaffPicker";
import { IconCalendar, IconChart, IconCheck, IconClock, IconDownload, IconFilter, IconPencil, IconUsers, IconXCircle } from "@/components/icons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string; date?: string; month?: string; page?: string; msg?: string; notice?: string; error?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const admin = session.privilege === "CEO" || session.privilege === "Admin";
  let staff = params.staff ? Number(params.staff) : undefined;
  if (!admin) staff = session.user_id;
  const month = params.month || undefined;
  const date = month ? undefined : !params.date ? isoDate() : params.date || undefined;
  const page = Math.max(1, Number(params.page || 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  let rows: Awaited<ReturnType<typeof hospitalAttendance>> = [];
  let total = 0;
  let summary: Awaited<ReturnType<typeof hospitalAttendanceStats>> | null = null;
  let staffName: { first: string | null; last: string | null } | null = null;
  let staffOptions: Awaited<ReturnType<typeof facilityStaffOptions>> = [];
  let loadError = params.error;
  try {
    const result = await withDb(async (db) => {
      const stats = await hospitalAttendanceStats(db, session.company_id, staff, date, month);
      const rows = await hospitalAttendance(db, session.company_id, offset, limit, staff, date, month);
      const staffOptions = admin ? await facilityStaffOptions(db, session.company_id) : [];
      const selected = staff ? staffOptions.find((option) => Number(option.user_id) === staff) : null;
      const staffName = staff
        ? selected ?? (staff === session.user_id ? { first: session.first ?? null, last: session.last ?? null } : null)
        : null;
      return { rows, total: stats.total, summary: stats, staffName, staffOptions };
    });
    rows = result.rows;
    total = result.total;
    summary = result.summary;
    staffName = result.staffName;
    staffOptions = result.staffOptions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dashboard]", message);
    loadError = `db:${message.slice(0, 160)}`;
  }

  const pages = Math.max(1, Math.ceil(total / limit));
  let title = "Attendance report";
  if (month) {
    title = `${staffName ? `${staffName.first} ${staffName.last}` : "All staff"} · ${formatMonthTitle(month)}`;
  } else if (date) {
    title = `${staffName ? `${staffName.first} ${staffName.last}` : "All staff"} · ${formatLongDate(date)}`;
  }

  const query = new URLSearchParams();
  if (staff) query.set("staff", String(staff));
  if (date) query.set("date", date);
  if (month) query.set("month", month);
  const prevQuery = new URLSearchParams(query);
  prevQuery.set("page", String(page - 1));
  const nextQuery = new URLSearchParams(query);
  nextQuery.set("page", String(page + 1));

  const csvHref = attendanceExportPath({ staff, date, month, format: "csv" });
  const excelHref = attendanceExportPath({ staff, date, month, format: "excel" });
  const selfName = `${session.first ?? ""} ${session.last ?? ""}`.trim();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
              <IconChart />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
              <p className="text-sm text-slate-500">{total} record{total === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        <FlashBanner notice={params.notice || params.msg} error={loadError} />

        <form method="get" className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
          <StaffPicker
            options={staffOptions}
            value={staff}
            readOnlyName={admin ? undefined : selfName || "Your records"}
          />
          <input type="date" name="date" defaultValue={date ?? ""} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
          <input type="month" name="month" defaultValue={month ?? ""} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff8002] py-2.5 font-semibold text-white hover:bg-[#d98324]"
          >
            <IconFilter size={16} />
            Filter
          </button>
        </form>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-green-800">
              <IconCheck size={16} /> Present
            </p>
            <p className="mt-1 text-3xl font-bold text-green-900">{Number(summary?.total_present ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-red-800">
              <IconXCircle size={16} /> Void
            </p>
            <p className="mt-1 text-3xl font-bold text-red-900">{Number(summary?.total_absent ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-[#fff4ea] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-[#d98324]">
              <IconClock size={16} /> Hours
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{minutesToHm(Number(summary?.total_minutes ?? 0))}</p>
          </div>
        </div>

        {admin ? (
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Management summary</h2>
                <p className="text-xs text-slate-500">Late means checked in after 9:00 AM. Long means over 12 hours or still open.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Late arrivals</p>
                <p className="mt-1 text-2xl font-bold text-amber-950">{summary?.late_arrivals ?? 0}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Long / incomplete shifts</p>
                <p className="mt-1 text-2xl font-bold text-red-950">{summary?.long_or_incomplete ?? 0}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">Completed attendance</p>
                <p className="mt-1 text-2xl font-bold text-blue-950">{summary?.attendance_percentage ?? 0}%</p>
              </div>
            </div>
            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Export a custom date range</summary>
              <form action="/api/reports/attendance" method="get" className="mt-3 grid gap-3 sm:grid-cols-4">
                <label className="text-sm text-slate-600">From<input required type="date" name="from" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
                <label className="text-sm text-slate-600">To<input required type="date" name="to" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
                <label className="text-sm text-slate-600">Staff<StaffPicker options={staffOptions} value={staff} /></label>
                <label className="text-sm text-slate-600">Format<select name="format" defaultValue="csv" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="csv">CSV</option><option value="excel">Excel</option></select></label>
                <button type="submit" className="rounded-lg bg-[#ff8002] px-4 py-2 font-semibold text-white sm:col-span-4">Download report</button>
              </form>
            </details>
          </section>
        ) : null}

        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Staff</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Check in</th>
                <th className="px-3 py-3">Check out</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Hours</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                    No records for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((attend, ky) => {
                  const badge =
                    attend.status_text === "Void"
                      ? "bg-red-100 text-red-800"
                      : attend.status_text === "Present"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-700";
                  return (
                    <tr key={attend.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-3 text-slate-400">{offset + ky + 1}</td>
                      <td className="px-3 py-3">
                        <Link
                          prefetch={false}
                          href={`/dashboard?staff=${attend.user_id}`}
                          className="inline-flex items-center gap-1 font-medium text-[#ff8002] hover:underline"
                        >
                          <IconUsers size={14} />
                          {attend.first_name ? `${attend.first_name} ${attend.last_name}` : attend.user_id}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <IconCalendar size={14} />
                          {isoDateValue(attend.attendance_date ?? attend.check_in_time)}
                        </span>
                      </td>
                      <td className="px-3 py-3">{actionDate(attend.check_in_time)}</td>
                      <td className="px-3 py-3">
                        {attend.check_out_time ? (
                          actionDate(attend.check_out_time)
                        ) : (
                          <span className="text-red-600">Not signed out</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>
                          {attend.status_text}
                        </span>
                      </td>
                      <td className="px-3 py-3">{attend.hours_worked ?? "-"}</td>
                      <td className="px-3 py-3">
                        {session.privilege === "CEO" ? (
                          <div className="flex gap-2">
                            <Link
                              prefetch={false}
                              href={`/dashboard/${attend.id}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#fff4ea] px-2 py-1 text-xs font-semibold text-[#d98324] hover:bg-[#ff8002] hover:text-white"
                            >
                              <IconPencil size={12} /> Edit
                            </Link>
                            <ConfirmDelete id={attend.id} />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">CEO only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <nav className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              prefetch={false}
              href={`/dashboard?${prevQuery.toString()}`}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              Prev
            </Link>
          ) : null}
          <span className="px-3 py-1.5 text-sm text-slate-600">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link
              prefetch={false}
              href={`/dashboard?${nextQuery.toString()}`}
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
