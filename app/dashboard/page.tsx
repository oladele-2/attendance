import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { withDb } from "@/lib/db";
import {
  getUserName,
  hospitalAttendance,
  hospitalAttendanceCount,
  hospitalAttendanceSummary,
} from "@/lib/queries";
import { actionDate, formatLongDate, formatMonthTitle, isoDateValue, minutesToHm } from "@/lib/dates";
import { isoDate } from "@/lib/face";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { FlashBanner } from "@/components/FlashBanner";
import { IconCalendar, IconChart, IconCheck, IconClock, IconFilter, IconPencil, IconUsers, IconXCircle } from "@/components/icons";

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
  const date = !params.date && !month ? isoDate() : params.date || undefined;
  const page = Math.max(1, Number(params.page || 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  let rows: Awaited<ReturnType<typeof hospitalAttendance>> = [];
  let total = 0;
  let summary: Awaited<ReturnType<typeof hospitalAttendanceSummary>> = null;
  let staffName: Awaited<ReturnType<typeof getUserName>> = null;
  let loadError = params.error;
  try {
    const result = await withDb(async (db) => {
      const total = await hospitalAttendanceCount(db, session.company_id, staff, date, month);
      const rows = await hospitalAttendance(db, session.company_id, offset, limit, staff, date, month);
      const summary = await hospitalAttendanceSummary(db, session.company_id, staff, date, month);
      const staffName = staff ? await getUserName(db, staff) : null;
      return { rows, total, summary, staffName };
    });
    rows = result.rows;
    total = result.total;
    summary = result.summary;
    staffName = result.staffName;
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconChart />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">{total} record{total === 1 ? "" : "s"}</p>
          </div>
        </div>
        <FlashBanner notice={params.notice || params.msg} error={loadError} />

        <form method="get" className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
          <input
            type="number"
            name="staff"
            placeholder="Staff ID"
            defaultValue={staff ?? ""}
            readOnly={!admin}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
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
