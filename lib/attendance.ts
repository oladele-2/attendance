import type { Connection } from "mysql2/promise";
import {
  getOpenAttendance,
  insertCheckIn,
  updateCheckOut,
  updatePrivilegeStatus,
} from "./queries";
import { isoDate } from "./face";

export async function punchAttendance(
  db: Connection,
  userId: number,
  companyId: number,
  privilegeId: number,
) {
  const open = await getOpenAttendance(db, userId, companyId);

  if (open?.check_in_time && !open.check_out_time) {
    await updateCheckOut(db, 1, open.id);
    // Same as PHP compare_verification.php: off-duty on AjirMed.
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
  };
}
