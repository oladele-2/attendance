import Link from "next/link";
import { saveAttendanceEdit } from "@/app/actions";
import { requireUser } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { getAttendanceById } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { IconCalendar, IconClock, IconSave } from "@/components/icons";
import { isoDateValue } from "@/lib/dates";
import { FlashBanner } from "@/components/FlashBanner";

function timeValue(value: string | Date | null) {
  if (!value) return "";
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

export default async function EditAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  if (session.privilege !== "CEO") redirect("/dashboard?error=ceo-only");
  const { id } = await params;
  const query = await searchParams;
  const attendance = await withDb((db) => getAttendanceById(db, Number(id)));
  if (!attendance || attendance.hospital_id !== session.company_id) notFound();

  const attendanceDate = isoDateValue(attendance.check_in_time || attendance.attendance_date);
  const save = saveAttendanceEdit.bind(null, attendance.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-2xl font-bold text-slate-800">Edit attendance</h2>
        <p className="mb-4 text-sm text-slate-500">Check-in is required. Leave check-out empty if the staff member has not signed out.</p>
        <FlashBanner error={query.error} />
        <form action={save} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <IconCalendar size={16} /> Date
            </label>
            <input type="date" value={attendanceDate} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5" />
            <input type="hidden" name="attendance_date" value={attendanceDate} />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <IconClock size={16} /> Check in
            </label>
            <input
              type="time"
              name="check_in_time"
              required
              defaultValue={timeValue(attendance.check_in_time)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <IconClock size={16} /> Check out
            </label>
            <input
              type="time"
              name="check_out_time"
              defaultValue={timeValue(attendance.check_out_time)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <PendingButton className="inline-flex items-center gap-2 rounded-xl bg-[#ff8002] px-4 py-2.5 font-semibold text-white hover:bg-[#d98324] disabled:cursor-not-allowed disabled:bg-gray-400">
              <IconSave size={16} /> Save
            </PendingButton>
            <Link href="/dashboard" className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
