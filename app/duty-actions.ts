"use server";

import { redirect } from "next/navigation";
import { withDb } from "@/lib/db";
import { getAttendanceById, getPrivilegeAtCompany, updateCheckOut, updatePrivilegeStatus } from "@/lib/queries";
import { isAdminRole } from "@/lib/roles";
import { getSession } from "@/lib/session";

function fail(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

export async function closeForgottenShift(formData: FormData) {
  const session = await getSession();
  if (!session?.company_id || !session.user_id) fail("/passcode", "session");
  if (!isAdminRole(session.privilege)) fail("/", "admin-only");
  const id = Number(formData.get("id"));
  const hours = String(formData.get("hours") ?? "12");
  if (!id) fail("/onduty", "not-found");

  try {
    await withDb(async (db) => {
      const record = await getAttendanceById(db, id);
      if (!record || record.hospital_id !== session.company_id || record.check_out_time) {
        throw new Error("not-found");
      }
      await updateCheckOut(db, 1, id);
      const privilege = await getPrivilegeAtCompany(db, record.user_id, session.company_id);
      if (privilege) await updatePrivilegeStatus(db, "DISAPPROVED", privilege.id);
    });
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") fail("/onduty", "not-found");
    fail("/onduty", "db");
  }
  redirect(`/onduty?hours=${encodeURIComponent(hours)}&notice=shift-closed`);
}
