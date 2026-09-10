import { DirectMarkButton } from "@/components/DirectMarkButton";
import { FaceCapture } from "@/components/FaceCapture";
import { FlashBanner } from "@/components/FlashBanner";
import { requireUser } from "@/lib/guards";
import { withDb } from "@/lib/db";
import {
  getUserContact,
  countShiftsToday,
  getLatestCompletedToday,
  getOpenAttendance,
} from "@/lib/queries";
import { actionDate, parseDateTime } from "@/lib/dates";
import { isoDate } from "@/lib/dates";
import { IconCamera, IconCheck, IconClock, IconPhone, IconScanFace, IconUser } from "@/components/icons";

function asText(value: unknown) {
  if (value == null) return "";
  const parsed = parseDateTime(value);
  if (parsed) return parsed.toISOString();
  return String(value);
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const today = isoDate();

  let user: { pre: string | null; phone: string | null } | null = null;
  let openShift: { check_in_time: string; check_in_day: string } | null = null;
  let lastCompleted: { check_in_time: string; check_out_time: string } | null = null;
  let shiftsToday = 0;
  let loadError: string | undefined = params.error;

  try {
    const result = await withDb(async (db) => {
      const foundUser = await getUserContact(db, session.user_id!);
      const open = await getOpenAttendance(db, session.user_id!, session.company_id);
      const completed = await getLatestCompletedToday(db, session.user_id!, session.company_id, today);
      const count = await countShiftsToday(db, session.user_id!, session.company_id, today);
      return { foundUser, open, completed, count };
    });

    user = result.foundUser
      ? { pre: result.foundUser.pre, phone: result.foundUser.phone }
      : null;

    if (result.open?.check_in_time) {
      openShift = {
        check_in_time: asText(result.open.check_in_time),
        check_in_day: isoDate(result.open.check_in_time),
      };
    }

    if (result.completed?.check_in_time && result.completed.check_out_time) {
      lastCompleted = {
        check_in_time: asText(result.completed.check_in_time),
        check_out_time: asText(result.completed.check_out_time),
      };
    }

    shiftsToday = result.count;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[verification]", message);
    loadError = `db:${message.slice(0, 160)}`;
  }

  let statusMessage = "You haven't checked in yet today.";
  let statusClass = "bg-[#fff8e6] border-[#ffcc80] text-[#b36b00]";
  let buttonLabel = "Check-in";
  let canPunch = !loadError;

  if (loadError) {
    statusMessage = "Attendance status could not be loaded.";
    statusClass = "bg-red-50 border-red-200 text-[#a40606]";
    buttonLabel = "Unavailable";
  } else if (openShift) {
    const dayLabel = openShift.check_in_day === today ? "today" : "on a previous day";
    statusMessage = `Checked in ${dayLabel} at ${actionDate(openShift.check_in_time)}. Don’t forget to check out.`;
    if (openShift.check_in_day < today) {
      statusMessage += " Night shift still open.";
    }
    statusClass = "bg-[#e6f7ff] border-[#80d4ff] text-[#006699]";
    buttonLabel = "Check-out";
  } else if (lastCompleted) {
    statusMessage = `Last shift: in at ${actionDate(lastCompleted.check_in_time)}, out at ${actionDate(lastCompleted.check_out_time)}. You can start another shift.`;
    if (shiftsToday > 1) {
      statusMessage += ` (${shiftsToday} shifts today)`;
    }
    statusClass = "bg-[#e6ffe6] border-[#80e680] text-[#267326]";
    buttonLabel = "Check-in again";
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

        {loadError ? <FlashBanner error={loadError} /> : null}

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
          {openShift || loadError ? (
            <IconClock className="mt-0.5 shrink-0" size={18} />
          ) : (
            <IconCheck className="mt-0.5 shrink-0" size={18} />
          )}
          <p>{statusMessage}</p>
        </div>

        <DirectMarkButton
          label={buttonLabel}
          personName={`${session.first ?? ""} ${session.last ?? ""}`.trim()}
          disabled={!canPunch}
          disabledReason={
            loadError
              ? "Fix the database error above, then refresh this page to mark attendance."
              : undefined
          }
        />

        <div className="border-t border-slate-200 pt-6">
          <h2 className="mb-1 flex items-center justify-center gap-2 text-lg font-semibold text-slate-700">
            <IconCamera size={18} />
            Or use face recognition
          </h2>
          <p className="mb-4 text-center text-sm text-slate-500">
            Optional. Look at the camera, then tap the face button.
          </p>
          <FaceCapture
            mode="verify"
            endpoint="/api/verify-face"
            buttonLabel={openShift ? "Check-out with face" : "Check-in with face"}
            confirmLabel={
              openShift
                ? `Check out now for ${session.first ?? ""} ${session.last ?? ""}?`
                : `Check in now for ${session.first ?? ""} ${session.last ?? ""}? This will be recorded immediately.`
            }
            requireFace
            disabled={!canPunch}
            disabledReason={
              loadError
                ? "Fix the database error above, then refresh this page."
                : undefined
            }
          />
        </div>
      </div>
    </main>
  );
}
