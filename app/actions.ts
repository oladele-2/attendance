"use server";

import { redirect } from "next/navigation";
import { withDb } from "@/lib/db";
import {
  deleteAttendance,
  getAttendanceById,
  getCompanyById,
  getPrivilegeAtCompany,
  getUserByEmail,
  getUserByPhone,
  getUserPrivileges,
  insertPrivilege,
  insertUser,
  uniqueFriendlySlug,
  updateAttendanceDash,
  updateCheckOut,
  updatePrivilegeStatus,
} from "@/lib/queries";
import { companyAllowsLogin, hashPhpPassword, isEmail, isPhone, userApproved, verifyPhpPassword } from "@/lib/auth";
import { getSession, setSession } from "@/lib/session";
import { normalizePhotoFilename } from "@/lib/brand";

function fail(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

function hhmm(raw: string) {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export async function submitPasscode(formData: FormData) {
  const raw = String(formData.get("facility_id") ?? "").trim();
  if (!/^\d+$/.test(raw)) {
    fail("/passcode", "invalid-passcode");
  }
  const facilityId = Number.parseInt(raw, 10);
  if (!Number.isFinite(facilityId)) {
    fail("/passcode", "invalid-passcode");
  }

  let facility;
  try {
    facility = await withDb((db) => getCompanyById(db, facilityId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[passcode]", message);
    // Temporary: surface the real failure so Cloudflare Logs / the URL show the cause.
    fail("/passcode", `db:${message.slice(0, 160)}`);
  }
  if (!facility) {
    fail("/passcode", "invalid-passcode");
  }
  try {
    await setSession({
      company_id: facility.id,
      company: facility.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[passcode-session]", message);
    fail("/passcode", "session");
  }
  redirect("/scan");
}

export async function submitPasswordLogin(formData: FormData) {
  const session = await getSession();
  if (!session?.company_id) fail("/passcode", "session");

  const identifier = String(formData.get("member_email") ?? "").trim();
  const password = String(formData.get("member_password") ?? "").trim();
  if (!identifier || !password) {
    fail("/signin", "missing-details");
  }

  let user;
  try {
    user = await withDb(async (db) => {
      if (isEmail(identifier)) return getUserByEmail(db, identifier);
      if (isPhone(identifier)) return getUserByPhone(db, identifier);
      return null;
    });
  } catch {
    fail("/signin", "db");
  }

  if (!user || !user.last || !user.pass || !verifyPhpPassword(password, user.last, user.pass)) {
    fail("/signin", "invalid-login");
  }
  if (!userApproved(user)) {
    redirect(`/signin?error=${encodeURIComponent(`Your account is currently marked as: ${user.status}. Contact support.`)}`);
  }

  let privileges;
  try {
    privileges = await withDb(async (db) => {
      const privileges = await getUserPrivileges(db, user.user_id, "Staff", "DISAPPROVED", session.company_id);
      const company = await getCompanyById(db, session.company_id);
      if (!privileges || !company || !companyAllowsLogin(company)) return null;
      return privileges;
    });
  } catch {
    fail("/signin", "db");
  }
  if (!privileges) {
    fail("/signin", "no-access");
  }

  try {
    await setSession({
      ...session,
      user_id: user.user_id,
      first: user.first,
      last: user.last,
      privilege: privileges.privilege,
      privilege_id: privileges.id,
    });
  } catch {
    fail("/signin", "session");
  }
  redirect("/verification");
}

export async function saveAttendanceEdit(id: number, formData: FormData) {
  const session = await getSession();
  if (!session?.company_id) fail("/passcode", "session");
  if (session.privilege !== "CEO") fail("/dashboard", "ceo-only");

  const attendanceDate = String(formData.get("attendance_date") ?? "").slice(0, 10);
  const checkInRaw = hhmm(String(formData.get("check_in_time") ?? ""));
  const checkOutRaw = hhmm(String(formData.get("check_out_time") ?? ""));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate) || !checkInRaw) {
    fail(`/dashboard/${id}/edit`, "invalid-times");
  }
  if (checkOutRaw && checkOutRaw < checkInRaw) {
    fail(`/dashboard/${id}/edit`, "invalid-times");
  }

  const status = checkOutRaw ? 1 : 0;
  const checkIn = `${attendanceDate} ${checkInRaw}:00`;
  const checkOut = checkOutRaw ? `${attendanceDate} ${checkOutRaw}:00` : null;

  let record;
  try {
    record = await withDb((db) => getAttendanceById(db, id));
  } catch {
    fail(`/dashboard/${id}/edit`, "db");
  }
  if (!record || record.hospital_id !== session.company_id) {
    fail("/dashboard", "not-found");
  }
  try {
    await withDb((db) =>
      updateAttendanceDash(db, id, session.company_id, checkIn, checkOut, status),
    );
  } catch {
    fail(`/dashboard/${id}/edit`, "db");
  }
  redirect("/dashboard?notice=updated");
}

export async function deleteAttendanceAction(formData: FormData) {
  const session = await getSession();
  if (!session?.company_id) fail("/passcode", "session");
  if (session.privilege !== "CEO") fail("/dashboard", "ceo-only");
  const id = Number(formData.get("id"));
  if (!id) fail("/dashboard", "not-found");

  let record;
  try {
    record = await withDb((db) => getAttendanceById(db, id));
  } catch {
    fail("/dashboard", "db");
  }
  if (!record || record.hospital_id !== session.company_id) {
    fail("/dashboard", "not-found");
  }
  try {
    await withDb((db) => deleteAttendance(db, id, session.company_id));
  } catch {
    fail("/dashboard", "db");
  }
  redirect("/dashboard?notice=deleted");
}

export async function closeForgottenShift(formData: FormData) {
  const session = await getSession();
  if (!session?.company_id || !session.user_id) fail("/passcode", "session");
  if (session.privilege !== "CEO" && session.privilege !== "Admin") fail("/", "admin-only");
  const id = Number(formData.get("id"));
  const hours = String(formData.get("hours") ?? "12");
  if (!id) fail("/duty", "not-found");

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
    if (error instanceof Error && error.message === "not-found") fail("/duty", "not-found");
    fail("/duty", "db");
  }
  redirect(`/duty?hours=${encodeURIComponent(hours)}&notice=shift-closed`);
}

const ELEVATED_ROLES = new Set(["ceo", "admin"]);

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhone(pre: string, local: string) {
  const code = digitsOnly(pre) || "234";
  let number = digitsOnly(local);
  if (number.startsWith("0")) number = number.slice(1);
  return { pre: code, phone: number };
}

export async function createStaff(formData: FormData) {
  const session = await getSession();
  if (!session?.company_id || !session.user_id) fail("/passcode", "session");
  if (session.privilege !== "CEO" && session.privilege !== "Admin") fail("/", "admin-only");

  const first = String(formData.get("first") ?? "").trim();
  const last = String(formData.get("last") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const gender = String(formData.get("gender") ?? "").trim();
  const roleRaw = String(formData.get("privilege") ?? "Staff").trim() || "Staff";
  const note = String(formData.get("note") ?? "").trim().slice(0, 100);
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const home = String(formData.get("home") ?? "").trim().slice(0, 300);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const { pre, phone } = normalizePhone(
    String(formData.get("pre") ?? "234"),
    String(formData.get("phone") ?? ""),
  );

  if (!first || !last || !isEmail(email) || !phone || phone.length < 7 || !gender) {
    fail("/staff/new", "missing-staff");
  }
  if (ELEVATED_ROLES.has(roleRaw.toLowerCase()) && session.privilege !== "CEO") {
    fail("/staff/new", "role-forbidden");
  }

  const img = normalizePhotoFilename(String(formData.get("img") ?? ""));
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) ? dobRaw : "1990-01-01";

  let result;
  try {
    result = await withDb(async (db) => {
      const byEmail = await getUserByEmail(db, email);
      const byPhone = await getUserByPhone(db, `+${pre}${phone}`);
      if (byPhone && byEmail && byPhone.user_id !== byEmail.user_id) {
        return { error: "phone-taken" as const };
      }
      if (byPhone && !byEmail) {
        return { error: "phone-taken" as const };
      }

      if (byEmail) {
        const existing = await getPrivilegeAtCompany(db, byEmail.user_id, session.company_id);
        if (existing) return { error: "staff-exists" as const };
        await insertPrivilege(db, {
          userId: byEmail.user_id,
          company: session.company_id,
          privilege: roleRaw,
          issuerId: session.user_id!,
          note,
        });
        return {
          notice: "staff-linked" as const,
          friendly: byEmail.friendly || String(byEmail.user_id),
        };
      }

      if (password.length < 8 || password !== confirm) {
        return { error: "weak-password" as const };
      }

      await db.beginTransaction();
      try {
        const friendly = await uniqueFriendlySlug(db, first, last);
        const userId = await insertUser(db, {
          first,
          last,
          email,
          pass: hashPhpPassword(password, last),
          friendly,
          gender,
          pre,
          phone,
          dob,
          home,
          img,
        });
        await insertPrivilege(db, {
          userId,
          company: session.company_id,
          privilege: roleRaw,
          issuerId: session.user_id!,
          note,
        });
        await db.commit();
        return { notice: "staff-added" as const, friendly };
      } catch (error) {
        await db.rollback();
        throw error;
      }
    });
  } catch {
    fail("/staff/new", "db");
  }

  if ("error" in result && result.error) fail("/staff/new", result.error);
  if ("friendly" in result && result.friendly) {
    redirect(`/staff/${result.friendly}?notice=${result.notice}`);
  }
  fail("/staff/new", "db");
}
