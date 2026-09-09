import type { Connection } from "mysql2/promise";
import {
  getDateAttendance,
  insertCheckIn,
  updateCheckOut,
  updatePrivilegeStatus,
} from "./queries";
import { addDays, isoDate } from "./face";

export async function punchAttendance(
  db: Connection,
  userId: number,
  companyId: number,
  privilegeId: number,
) {
  const today = isoDate();
  const yesterday = addDays(today, -1);
  let attendance = await getDateAttendance(db, userId, today, companyId);
  let source: "today" | "yesterday" = "today";
  if (!attendance) {
    const y = await getDateAttendance(db, userId, yesterday, companyId);
    if (y?.check_in_time && !y.check_out_time) {
      attendance = y;
      source = "yesterday";
    }
  }

  if (!attendance) {
    await insertCheckIn(db, userId, today, companyId);
    await updatePrivilegeStatus(db, "Staff", privilegeId);
    return { success: true as const, action: "Checked in", note: "" };
  }
  if (attendance.check_in_time && !attendance.check_out_time) {
    await updateCheckOut(db, 1, attendance.id);
    await updatePrivilegeStatus(db, "DISAPPROVED", privilegeId);
    const note = source === "yesterday" ? " (Night shift from yesterday)" : "";
    return { success: true as const, action: "Checked out", note };
  }
  return {
    success: false as const,
    message: "You already checked out for this shift. Ask a CEO to edit the record if something is wrong.",
  };
}
