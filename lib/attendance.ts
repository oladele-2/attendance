import type { Connection } from "mysql2/promise";
import {
  deleteOwnOpenCheckIn,
  getAttendanceById,
  getOpenAttendance,
  insertCheckIn,
  reopenOwnCheckOut,
  updateCheckOut,
  updatePrivilegeStatus,
} from "./queries";
import { isoDate, parseDateTime } from "./dates";
import { OPEN_SHIFT_MAX_MINUTES } from "./shift-rules";

export const UNDO_SECONDS = 120;
export { OPEN_SHIFT_MAX_HOURS, OPEN_SHIFT_MAX_MINUTES } from "./shift-rules";

export async function punchAttendance(
  db: Connection,
  userId: number,
  companyId: number,
) {
  await db.beginTransaction();
  try {
    // Only open shifts within OPEN_SHIFT_MAX_HOURS are eligible for check-out.
    // Older open rows are void and left alone; this punch creates a new check-in.
    const open = await getOpenAttendance(db, userId, companyId);
    const minutesOpen = Math.max(0, Number(open?.minutes_open ?? 0));
    const canCheckOut =
      Boolean(open?.check_in_time && !open.check_out_time) && minutesOpen < OPEN_SHIFT_MAX_MINUTES;

    if (canCheckOut && open) {
      await updateCheckOut(db, 1, open.id);
      await updatePrivilegeStatus(db, "DISAPPROVED", userId, companyId);
      await db.commit();
      const checkInDay = isoDate(open.check_in_time);
      const today = isoDate();
      const note = checkInDay < today ? " (Night shift from a previous day)" : "";
      return {
        success: true as const,
        action: "Checked out" as const,
        note,
        attendanceId: open.id,
        signedOut: true,
        durationMinutes: minutesOpen,
      };
    }

    const attendanceId = await insertCheckIn(db, userId, companyId);
    await updatePrivilegeStatus(db, "Staff", userId, companyId);
    await db.commit();
    return {
      success: true as const,
      action: "Checked in" as const,
      note: "",
      attendanceId,
      signedOut: false,
      durationMinutes: 0,
    };
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

export async function undoAttendance(
  db: Connection,
  userId: number,
  companyId: number,
  attendanceId: number,
) {
  await db.beginTransaction();
  try {
    const row = await getAttendanceById(db, attendanceId);
    if (!row || Number(row.user_id) !== userId || Number(row.hospital_id) !== companyId) {
      throw new Error("That punch could not be undone.");
    }
    const stamp = row.check_out_time || row.check_in_time;
    const when = parseDateTime(stamp);
    if (!when || Date.now() - when.getTime() > UNDO_SECONDS * 1000) {
      throw new Error("The undo window has closed (2 minutes).");
    }
    if (row.check_out_time) {
      const ok = await reopenOwnCheckOut(db, attendanceId, userId, companyId);
      if (!ok) throw new Error("That punch could not be undone.");
      await updatePrivilegeStatus(db, "Staff", userId, companyId);
      await db.commit();
      return { action: "undid-checkout" as const };
    }
    const ok = await deleteOwnOpenCheckIn(db, attendanceId, userId, companyId);
    if (!ok) throw new Error("That punch could not be undone.");
    await updatePrivilegeStatus(db, "DISAPPROVED", userId, companyId);
    await db.commit();
    return { action: "undid-checkin" as const };
  } catch (error) {
    await db.rollback();
    throw error;
  }
}
