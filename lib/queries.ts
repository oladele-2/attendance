import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { queryAll, queryOne } from "./db";
import type { AttendanceRow, CompanyRow, PrivilegeRow, UserRow } from "./types";

type CountRow = RowDataPacket & { total: number };
type SummaryRow = RowDataPacket & {
  total_present: number | null;
  total_absent: number | null;
  total_minutes: number | null;
};

/** Day key for a row — always derived from check_in_time (no attendance_date column). */
const DAY_EXPR = (alias = "") => {
  const prefix = alias ? `${alias}.` : "";
  return `DATE(${prefix}check_in_time)`;
};

export async function getCompanyById(db: Connection, id: number) {
  return queryOne<RowDataPacket & CompanyRow>(db, "SELECT * FROM `company` WHERE `id`=?", [id]);
}

export async function getUserById(db: Connection, id: number) {
  return queryOne<RowDataPacket & UserRow>(db, "SELECT * FROM `user` WHERE `user_id`=?", [id]);
}

export async function getUserByFriendly(db: Connection, friend: string) {
  return queryOne<RowDataPacket & { user_id: number }>(
    db,
    "SELECT user_id FROM `user` WHERE `friendly`=?",
    [friend],
  );
}

export async function getUserByEmail(db: Connection, email: string) {
  return queryOne<RowDataPacket & UserRow>(db, "SELECT * FROM `user` WHERE `email`=?", [email]);
}

export async function getUserByPhone(db: Connection, phone: string) {
  return queryOne<RowDataPacket & UserRow>(
    db,
    "SELECT * FROM `user` WHERE CONCAT(`pre`,`phone`)=?",
    [phone],
  );
}

export async function getUserPrivileges(
  db: Connection,
  userId: number,
  status: string,
  statusTwo: string,
  company: number,
) {
  return queryOne<RowDataPacket & PrivilegeRow>(
    db,
    "SELECT * FROM `privilege` WHERE `user_id`=? AND (`status`=? OR `status`=?) AND `company`=?",
    [userId, status, statusTwo, company],
  );
}

export async function getPrivilegeAtCompany(db: Connection, userId: number, company: number) {
  return queryOne<RowDataPacket & PrivilegeRow>(
    db,
    "SELECT * FROM `privilege` WHERE `user_id`=? AND `company`=? LIMIT 1",
    [userId, company],
  );
}

/** Latest open shift for this staff at this facility (supports overnight + multi-shift days). */
export async function getOpenAttendance(db: Connection, userId: number, hospitalId: number) {
  return queryOne<RowDataPacket & AttendanceRow>(
    db,
    `SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
     FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND check_in_time IS NOT NULL AND check_out_time IS NULL
     ORDER BY check_in_time DESC
     LIMIT 1`,
    [userId, hospitalId],
  );
}

/** Most recent completed shift started today (for status messaging only). */
export async function getLatestCompletedToday(
  db: Connection,
  userId: number,
  hospitalId: number,
  today: string,
) {
  return queryOne<RowDataPacket & AttendanceRow>(
    db,
    `SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
     FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND ${DAY_EXPR()}=? AND check_out_time IS NOT NULL
     ORDER BY check_out_time DESC
     LIMIT 1`,
    [userId, hospitalId, today],
  );
}

export async function countShiftsToday(
  db: Connection,
  userId: number,
  hospitalId: number,
  today: string,
) {
  const row = await queryOne<CountRow>(
    db,
    `SELECT COUNT(id) AS total FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND ${DAY_EXPR()}=?`,
    [userId, hospitalId, today],
  );
  return Number(row?.total ?? 0);
}

export async function getAttendanceById(db: Connection, id: number) {
  return queryOne<RowDataPacket & AttendanceRow>(
    db,
    `SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
     FROM attendance WHERE id=?`,
    [id],
  );
}

export async function staffPrivilegeCount(db: Connection, status: string, company: number) {
  const [rows] = await db.query<CountRow[]>(
    "SELECT COUNT(*) AS total FROM `privilege` WHERE `status`=? AND `company`=?",
    [status, company],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function staffPrivilegePage(
  db: Connection,
  status: string,
  company: number,
  offset: number,
  limit: number,
) {
  return queryAll<RowDataPacket & { user_id: number }>(
    db,
    "SELECT `user_id` FROM `privilege` WHERE `status`=? AND `company`=? LIMIT ?,?",
    [status, company, offset, limit],
  );
}

function attendanceFilter(
  company: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
  alias = "",
) {
  const col = alias ? `${alias}.` : "";
  const day = DAY_EXPR(alias);
  let sql = ` WHERE ${col}hospital_id=?`;
  const params: unknown[] = [company];
  if (staff) {
    sql += ` AND ${col}user_id=?`;
    params.push(staff);
  }
  if (date) {
    sql += ` AND ${day}=?`;
    params.push(date);
  }
  if (month) {
    const [year, mon] = month.split("-");
    sql += ` AND YEAR(${day})=? AND MONTH(${day})=?`;
    params.push(Number(year), Number(mon));
  }
  return { sql, params };
}

export async function hospitalAttendanceCount(
  db: Connection,
  company: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
) {
  const filter = attendanceFilter(company, staff, date, month);
  const row = await queryOne<CountRow>(
    db,
    "SELECT COUNT(id) as total FROM attendance" + filter.sql,
    filter.params,
  );
  return Number(row?.total ?? 0);
}

export async function hospitalAttendance(
  db: Connection,
  company: number,
  offset: number,
  limit: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
) {
  const filter = attendanceFilter(company, staff, date, month, "a");
  const day = DAY_EXPR("a");
  return queryAll<RowDataPacket & AttendanceRow>(
    db,
    `SELECT a.id, a.user_id, ${day} AS attendance_date, a.check_in_time, a.check_out_time, a.status,
        u.first AS first_name, u.last AS last_name,
        CASE
            WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NULL THEN 'Void'
            WHEN a.status = 1 THEN 'Present'
            WHEN a.status = 0 THEN 'Absent'
            ELSE 'Unknown'
        END AS status_text,
        TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time) AS hours_worked
    FROM attendance a
    LEFT JOIN user u ON u.user_id = a.user_id
    ${filter.sql}
    ORDER BY a.check_in_time DESC
    LIMIT ?,?`,
    [...filter.params, offset, limit],
  );
}

export async function hospitalAttendanceSummary(
  db: Connection,
  company: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
) {
  const filter = attendanceFilter(company, staff, date, month);
  return queryOne<SummaryRow>(
    db,
    `SELECT
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS total_present,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS total_absent,
        SUM(CASE WHEN status = 1 THEN TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) ELSE 0 END) AS total_minutes
      FROM attendance${filter.sql}`,
    filter.params,
  );
}

export async function insertCheckIn(db: Connection, userId: number, hospitalId: number) {
  // Hyperdrive MySQL supports query() text protocol, not COM_STMT_PREPARE.
  await db.query<ResultSetHeader>(
    "INSERT INTO attendance (user_id, check_in_time, hospital_id, status) VALUES (?, NOW(), ?, 0)",
    [userId, hospitalId],
  );
}

export async function updateCheckOut(db: Connection, status: number, id: number) {
  await db.query("UPDATE attendance SET status = ?, check_out_time = NOW() WHERE id = ?", [status, id]);
}

export async function updateAttendanceDash(
  db: Connection,
  id: number,
  hospitalId: number,
  checkIn: string | null,
  checkOut: string | null,
  status: number,
) {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE attendance SET check_in_time=?, check_out_time=?, status=? WHERE id=? AND hospital_id=?",
    [checkIn, checkOut, status, id, hospitalId],
  );
  return result.affectedRows > 0;
}

export async function deleteAttendance(db: Connection, id: number, hospitalId: number) {
  const [result] = await db.query<ResultSetHeader>("DELETE FROM attendance WHERE id=? AND hospital_id=?", [
    id,
    hospitalId,
  ]);
  return result.affectedRows > 0;
}

export async function updateFaceVector(db: Connection, faceVector: string, userId: number) {
  await db.query("UPDATE user SET face_vector = ? WHERE user_id = ?", [faceVector, userId]);
}

export async function updatePrivilegeStatus(db: Connection, status: string, id: number) {
  await db.query("UPDATE `privilege` SET `status`=?, `at`=now() WHERE `id`=?", [status, id]);
}
