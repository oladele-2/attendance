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

export const UNDO_SECONDS = 120;

export async function punchAttendance(
  db: Connection,
  userId: number,
  companyId: number,
  privilegeId: number,
) {
  const open = await getOpenAttendance(db, userId, companyId);

  if (open?.check_in_time && !open.check_out_time) {
    await updateCheckOut(db, 1, open.id);
    await updatePrivilegeStatus(db, "DISAPPROVED", privilegeId);
    const checkInDay = isoDate(open.check_in_time);
    const today = isoDate();
    const note = checkInDay < today ? " (Night shift from a previous day)" : "";
    return {
      success: true as const,
      action: "Checked out" as const,
      note,
      attendanceId: open.id,
      signedOut: true,
      durationMinutes: Math.max(0, Number(open.minutes_open ?? 0)),
    };
  }

  const attendanceId = await insertCheckIn(db, userId, companyId);
  await updatePrivilegeStatus(db, "Staff", privilegeId);
  return {
    success: true as const,
    action: "Checked in" as const,
    note: "",
    attendanceId,
    signedOut: false,
    durationMinutes: 0,
  };
}

export async function undoAttendance(
  db: Connection,
  userId: number,
  companyId: number,
  privilegeId: number,
  attendanceId: number,
) {
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
    await updatePrivilegeStatus(db, "Staff", privilegeId);
    return { action: "undid-checkout" as const };
  }
  const ok = await deleteOwnOpenCheckIn(db, attendanceId, userId, companyId);
  if (!ok) throw new Error("That punch could not be undone.");
  await updatePrivilegeStatus(db, "DISAPPROVED", privilegeId);
  return { action: "undid-checkin" as const };
}
