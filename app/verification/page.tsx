import { DirectMarkButton } from "@/components/DirectMarkButton";
import { FaceCapture } from "@/components/FaceCapture";
import { requireUser } from "@/app/actions";
import { withDb } from "@/lib/db";
import { getDateAttendance, getUserById } from "@/lib/queries";
import { actionDate } from "@/lib/dates";
import { addDays, isoDate } from "@/lib/face";
import { IconCamera, IconCheck, IconClock, IconPhone, IconScanFace, IconUser } from "@/components/icons";

export default async function VerificationPage() {
  const session = await requireUser();
  const today = isoDate();
  const yesterday = addDays(today, -1);

  const { user, attendance, source } = await withDb(async (db) => {
    const user = await getUserById(db, session.user_id!);
    let attendance = await getDateAttendance(db, session.user_id!, today, session.company_id);
    let source: "today" | "yesterday" = "today";
    if (!attendance) {
      const y = await getDateAttendance(db, session.user_id!, yesterday, session.company_id);
      if (y?.check_in_time && !y.check_out_time) {
        attendance = y;
        source = "yesterday";
      }
    }
    return { user, attendance, source };
  });

  let statusMessage = "You haven't checked in yet today.";
  let statusClass = "bg-[#fff8e6] border-[#ffcc80] text-[#b36b00]";
  let buttonLabel = "Check-in";
  let canPunch = true;
  if (attendance?.check_in_time && !attendance.check_out_time) {
    const dayLabel = source === "yesterday" ? "Yesterday" : "Today";
    statusMessage = `Checked in ${dayLabel} at ${actionDate(attendance.check_in_time)}. Don’t forget to check out.`;
    if (source === "yesterday") statusMessage += " Night shift continuing from yesterday.";
    statusClass = "bg-[#e6f7ff] border-[#80d4ff] text-[#006699]";
    buttonLabel = "Check-out";
  } else if (attendance?.check_in_time && attendance.check_out_time) {
    const dayLabel = source === "yesterday" ? "Yesterday" : "Today";
    statusMessage = `Checked in ${dayLabel} at ${actionDate(attendance.check_in_time)} and out at ${actionDate(attendance.check_out_time)}. Have a great rest of your day!`;
    statusClass = "bg-[#e6ffe6] border-[#80e680] text-[#267326]";
    buttonLabel = "Done for today";
    canPunch = false;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconScanFace size={28} />
          </span>
          <h1 className="text-3xl font-bold text-slate-800">Mark Attendance</h1>
        </div>

        <div className="mb-5 rounded-xl bg-slate-50 p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#ff8002] shadow-sm">
            <IconUser />
          </div>
          <strong className="block text-xl text-slate-800">
            {session.first} {session.last}
          </strong>
          <span className="text-sm text-slate-500">{session.privilege ?? "Staff"}</span>
          {user?.phone ? (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-500">
              <IconPhone size={14} /> +{user.pre}
              {user.phone}
            </p>
          ) : null}
        </div>

        <div className={`mx-auto mb-6 flex max-w-xl items-start gap-2 rounded-xl border p-4 text-sm font-medium ${statusClass}`}>
          {canPunch ? <IconClock className="mt-0.5 shrink-0" size={18} /> : <IconCheck className="mt-0.5 shrink-0" size={18} />}
          <p>{statusMessage}</p>
        </div>

        <DirectMarkButton label={buttonLabel} disabled={!canPunch} />

        <div className="border-t border-slate-200 pt-6">
          <h2 className="mb-1 flex items-center justify-center gap-2 text-lg font-semibold text-slate-700">
            <IconCamera size={18} />
            Or use face recognition
          </h2>
          <p className="mb-4 text-center text-sm text-slate-500">Optional. Look at the camera, then tap the face button.</p>
          <FaceCapture
            mode="verify"
            endpoint="/api/verify-face"
            buttonLabel={`Mark with face`}
            requireFace
            disabled={!canPunch}
          />
        </div>
      </div>
    </main>
  );
}
