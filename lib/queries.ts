import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { queryAll, queryOne } from "./db";
import type { AttendanceRow, CompanyRow, PrivilegeRow, UserRow } from "./types";

type CountRow = RowDataPacket & { total: number };
type SummaryRow = RowDataPacket & {
  total_present: number | null;
  total_absent: number | null;
  total_minutes: number | null;
  late_arrivals: number | null;
  long_or_incomplete: number | null;
  attendance_percentage: number | null;
};

/** Day key for a row — always derived from check_in_time (no attendance_date column). */
const DAY_EXPR = (alias = "") => {
  const prefix = alias ? `${alias}.` : "";
  return `DATE(${prefix}check_in_time)`;
};

function nextIsoDay(day: string) {
  const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== day) return null;
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function monthBounds(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start: `${month}-01`, end: next.toISOString().slice(0, 10) };
}

/** Hyperdrive caches identical SELECTs and does not invalidate them after INSERT/UPDATE. */
const FRESH_READ = "/* NOW() */";

const USER_COLS =
  "`user_id`, `first`, `last`, `email`, `pass`, `status`, `friendly`, `gender`, `pre`, `phone`, `img`, `staff_id`";

export async function getCompanyById(db: Connection, id: number) {
  return queryOne<RowDataPacket & CompanyRow>(
    db,
    "SELECT `id`, `name`, `type`, `status`, `logo`, `website`, `house_no`, `street`, `city`, `country`, `about` FROM `company` WHERE `id`=?",
    [id],
  );
}

export async function getUserById(db: Connection, id: number) {
  return queryOne<RowDataPacket & UserRow>(db, `SELECT ${USER_COLS} FROM \`user\` WHERE \`user_id\`=?`, [id]);
}

export async function getUserContact(db: Connection, id: number) {
  return queryOne<RowDataPacket & { pre: string | null; phone: string | null }>(
    db,
    "SELECT `pre`, `phone` FROM `user` WHERE `user_id`=?",
    [id],
  );
}

export async function getUserName(db: Connection, id: number) {
  return queryOne<RowDataPacket & { first: string; last: string }>(
    db,
    "SELECT `first`, `last` FROM `user` WHERE `user_id`=?",
    [id],
  );
}

export async function getUserFaceVector(db: Connection, id: number) {
  return queryOne<RowDataPacket & { face_vector: string | null }>(
    db,
    "SELECT `face_vector` FROM `user` WHERE `user_id`=?",
    [id],
  );
}

export async function getUserByFriendly(db: Connection, friend: string) {
  return queryOne<RowDataPacket & { user_id: number }>(
    db,
    "SELECT user_id FROM `user` WHERE `friendly`=?",
    [friend],
  );
}

export async function getUserByEmail(db: Connection, email: string) {
  return queryOne<RowDataPacket & UserRow>(db, `SELECT ${USER_COLS} FROM \`user\` WHERE \`email\`=?`, [email]);
}

export async function getUserByPhone(db: Connection, phone: string) {
  const digits = phone.replace(/\D/g, "");
  return queryOne<RowDataPacket & UserRow>(
    db,
    `SELECT ${USER_COLS} FROM \`user\` WHERE CONCAT(\`pre\`,\`phone\`)=? OR CONCAT('+',\`pre\`,\`phone\`)=? OR \`phone\`=? LIMIT 1`,
    [digits, phone, digits],
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
    "SELECT `id`, `user_id`, `status`, `company`, `privilege` FROM `privilege` WHERE `user_id`=? AND (`status`=? OR `status`=?) AND `company`=?",
    [userId, status, statusTwo, company],
  );
}

export async function getPrivilegeAtCompany(db: Connection, userId: number, company: number) {
  return queryOne<RowDataPacket & PrivilegeRow>(
    db,
    "SELECT `id`, `user_id`, `status`, `company`, `privilege` FROM `privilege` WHERE `user_id`=? AND `company`=? LIMIT 1",
    [userId, company],
  );
}

/** Latest open shift for this staff at this facility (supports overnight + multi-shift days). */
export async function getOpenAttendance(db: Connection, userId: number, hospitalId: number) {
  return queryOne<RowDataPacket & AttendanceRow & { minutes_open: number }>(
    db,
    `${FRESH_READ}
     SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status,
       TIMESTAMPDIFF(MINUTE, check_in_time, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+01:00')) AS minutes_open
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
    `${FRESH_READ}
     SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
     FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND check_in_time>=? AND check_in_time<? AND check_out_time IS NOT NULL
     ORDER BY check_out_time DESC
     LIMIT 1`,
    [userId, hospitalId, `${today} 00:00:00`, `${nextIsoDay(today) ?? today} 00:00:00`],
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
    `${FRESH_READ}
     SELECT COUNT(*) AS total FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND check_in_time>=? AND check_in_time<?`,
    [userId, hospitalId, `${today} 00:00:00`, `${nextIsoDay(today) ?? today} 00:00:00`],
  );
  return Number(row?.total ?? 0);
}

export async function getAttendanceById(db: Connection, id: number) {
  return queryOne<RowDataPacket & AttendanceRow>(
    db,
    `${FRESH_READ}
     SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
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
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 10);
  return queryAll<RowDataPacket & { user_id: number }>(
    db,
    `SELECT \`user_id\` FROM \`privilege\` WHERE \`status\`=? AND \`company\`=? LIMIT ${safeOffset},${safeLimit}`,
    [status, company],
  );
}

function rosterEmployeeWhere(company: number, search?: string) {
  let sql = ` WHERE p.\`company\`=? AND (p.\`status\`=? OR p.\`status\`=?)
       AND LOWER(TRIM(p.\`privilege\`)) <> 'patient'`;
  const params: unknown[] = [company, "Staff", "DISAPPROVED"];
  const term = search?.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "")}%`;
    const digits = term.replace(/\D/g, "");
    sql += ` AND (
        u.\`first\` LIKE ? OR u.\`last\` LIKE ? OR u.\`email\` LIKE ?
        OR CONCAT(u.\`first\`, ' ', u.\`last\`) LIKE ?
        OR u.\`phone\` LIKE ? OR CONCAT(u.\`pre\`, u.\`phone\`) LIKE ?
      )`;
    params.push(like, like, like, like, like, digits ? `%${digits}%` : like);
  }
  return { sql, params };
}

export async function companyStaffCount(db: Connection, company: number, search?: string) {
  const filter = rosterEmployeeWhere(company, search);
  const row = await queryOne<CountRow>(
    db,
    `${FRESH_READ} SELECT COUNT(*) AS total FROM \`privilege\` p
     LEFT JOIN \`user\` u ON u.\`user_id\` = CAST(TRIM(p.\`user_id\`) AS UNSIGNED)
     ${filter.sql}`,
    filter.params,
  );
  return Number(row?.total ?? 0);
}

export async function companyStaffPage(
  db: Connection,
  company: number,
  offset: number,
  limit: number,
  search?: string,
) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const filter = rosterEmployeeWhere(company, search);
  return queryAll<
    RowDataPacket & {
      user_id: number;
      privilege: string;
      status: string;
      first: string | null;
      last: string | null;
      friendly: string | null;
      gender: string | null;
      pre: string | null;
      phone: string | null;
      img: string | null;
      has_face: number;
    }
  >(
    db,
    `${FRESH_READ} SELECT CAST(TRIM(p.\`user_id\`) AS UNSIGNED) AS user_id, p.\`privilege\`, p.\`status\`,
        u.\`first\`, u.\`last\`, u.\`friendly\`, u.\`gender\`, u.\`pre\`, u.\`phone\`, u.\`img\`,
        IF(u.\`face_vector\` IS NULL OR u.\`face_vector\` = '', 0, 1) AS has_face
     FROM \`privilege\` p
     LEFT JOIN \`user\` u ON u.\`user_id\` = CAST(TRIM(p.\`user_id\`) AS UNSIGNED)
     ${filter.sql}
     ORDER BY u.\`last\`, u.\`first\` LIMIT ${safeOffset},${safeLimit}`,
    filter.params,
  );
}

export async function facilityStaffOptions(db: Connection, company: number) {
  return queryAll<RowDataPacket & { user_id: number; first: string | null; last: string | null }>(
    db,
    `${FRESH_READ} SELECT CAST(TRIM(p.\`user_id\`) AS UNSIGNED) AS user_id, u.\`first\`, u.\`last\`
     FROM \`privilege\` p
     LEFT JOIN \`user\` u ON u.\`user_id\` = CAST(TRIM(p.\`user_id\`) AS UNSIGNED)
     WHERE p.\`company\`=? AND (p.\`status\`=? OR p.\`status\`=?)
       AND LOWER(TRIM(p.\`privilege\`)) <> 'patient'
     ORDER BY u.\`last\`, u.\`first\`
     LIMIT 500`,
    [company, "Staff", "DISAPPROVED"],
  );
}

export async function getFacilityStaffProfile(db: Connection, ref: string, company: number) {
  const byId = /^\d+$/.test(ref);
  return queryOne<
    RowDataPacket & { user_id: number; first: string; last: string; friendly: string | null; has_face: number }
  >(
    db,
    `${FRESH_READ} SELECT u.\`user_id\`, u.\`first\`, u.\`last\`, u.\`friendly\`,
        IF(u.\`face_vector\` IS NULL OR u.\`face_vector\` = '', 0, 1) AS has_face
     FROM \`user\` u
     INNER JOIN \`privilege\` p ON CAST(TRIM(p.\`user_id\`) AS UNSIGNED) = u.\`user_id\` AND p.\`company\`=?
       AND (p.\`status\`=? OR p.\`status\`=?) AND LOWER(TRIM(p.\`privilege\`)) <> 'patient'
     WHERE ${byId ? "u.`user_id`=?" : "u.`friendly`=?"}
     LIMIT 1`,
    [company, "Staff", "DISAPPROVED", byId ? Number(ref) : ref],
  );
}

export async function uniqueFriendlySlug(db: Connection, first: string, last: string) {
  const base =
    `${first}-${last}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "staff";
  const reserved = new Set(["new", "add"]);
  let slug = reserved.has(base) ? `${base}-member` : base;
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? slug : `${base}-${i + 1}`;
    const existing = await getUserByFriendly(db, candidate);
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function insertUser(
  db: Connection,
  input: {
    first: string;
    last: string;
    email: string;
    pass: string;
    friendly: string;
    gender: string;
    pre: string;
    phone: string;
    dob: string;
    home: string;
    img: string;
  },
) {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO \`user\` (
      \`first\`, \`last\`, \`identity\`, \`friendly\`, \`email\`, \`pre\`, \`phone\`, \`pass\`,
      \`img\`, \`gender\`, \`dob\`, \`home\`, \`town\`, \`country\`, \`date_city\`, \`status\`, \`at\`
    ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'Nigeria', 'Africa/Lagos', 'APPROVED', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'))`,
    [
      input.first,
      input.last,
      input.friendly,
      input.email,
      input.pre,
      input.phone,
      input.pass,
      input.img,
      input.gender,
      input.dob,
      input.home,
    ],
  );
  if (!result.insertId) {
    throw new Error("Staff account was not saved.");
  }
  return Number(result.insertId);
}

export async function insertPrivilege(
  db: Connection,
  input: {
    userId: number;
    company: number;
    privilege: string;
    issuerId: number;
    note: string;
  },
) {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO \`privilege\` (
      \`user_id\`, \`privilege\`, \`status\`, \`issuer_id\`, \`at\`, \`company\`, \`note\`, \`last_seen\`
    ) VALUES (?, ?, 'DISAPPROVED', ?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), ?, ?, '')`,
    [String(input.userId), input.privilege, String(input.issuerId), String(input.company), input.note],
  );
  if (!result.insertId) {
    throw new Error("Staff access at this facility was not saved.");
  }
  return Number(result.insertId);
}

function attendanceFilter(
  company: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
  alias = "",
  from?: string | null,
  to?: string | null,
) {
  const col = alias ? `${alias}.` : "";
  let sql = ` WHERE ${col}hospital_id=?`;
  const params: unknown[] = [company];
  if (staff) {
    sql += ` AND ${col}user_id=?`;
    params.push(staff);
  }
  if (from || to) {
    if (from && !nextIsoDay(from)) return { sql: `${sql} AND 1=0`, params };
    if (to && !nextIsoDay(to)) return { sql: `${sql} AND 1=0`, params };
    if (from) {
      sql += ` AND ${col}check_in_time>=?`;
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      sql += ` AND ${col}check_in_time<?`;
      params.push(`${nextIsoDay(to)} 00:00:00`);
    }
  } else if (month) {
    const bounds = monthBounds(month);
    if (!bounds) return { sql: `${sql} AND 1=0`, params };
    sql += ` AND ${col}check_in_time>=? AND ${col}check_in_time<?`;
    params.push(`${bounds.start} 00:00:00`, `${bounds.end} 00:00:00`);
  } else if (date) {
    const next = nextIsoDay(date);
    if (!next) return { sql: `${sql} AND 1=0`, params };
    sql += ` AND ${col}check_in_time>=? AND ${col}check_in_time<?`;
    params.push(`${date} 00:00:00`, `${next} 00:00:00`);
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
    `${FRESH_READ} SELECT COUNT(*) as total FROM attendance` + filter.sql,
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
  from?: string | null,
  to?: string | null,
) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const filter = attendanceFilter(company, staff, date, month, "a", from, to);
  const day = DAY_EXPR("a");
  return queryAll<RowDataPacket & AttendanceRow>(
    db,
    `${FRESH_READ}
    SELECT a.id, a.user_id, ${day} AS attendance_date, a.check_in_time, a.check_out_time, a.status,
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
    LIMIT ${safeOffset},${safeLimit}`,
    filter.params,
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
    `${FRESH_READ}
      SELECT
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS total_present,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS total_absent,
        SUM(CASE WHEN status = 1 THEN TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) ELSE 0 END) AS total_minutes
      FROM attendance${filter.sql}`,
    filter.params,
  );
}

/** Count and summary in one scan/query for report pages. */
export async function hospitalAttendanceStats(
  db: Connection,
  company: number,
  staff?: number | null,
  date?: string | null,
  month?: string | null,
) {
  const filter = attendanceFilter(company, staff, date, month);
  const row = await queryOne<SummaryRow & CountRow>(
    db,
    `${FRESH_READ} SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS total_present,
       SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS total_absent,
       SUM(CASE WHEN status = 1 THEN TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) ELSE 0 END) AS total_minutes,
       SUM(CASE WHEN TIME(check_in_time) > '09:00:00' THEN 1 ELSE 0 END) AS late_arrivals,
       SUM(CASE WHEN check_out_time IS NULL OR TIMESTAMPDIFF(MINUTE, check_in_time, check_out_time) > 720 THEN 1 ELSE 0 END) AS long_or_incomplete,
       ROUND(100 * SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS attendance_percentage
     FROM attendance${filter.sql}`,
    filter.params,
  );
  return {
    total: Number(row?.total ?? 0),
    total_present: Number(row?.total_present ?? 0),
    total_absent: Number(row?.total_absent ?? 0),
    total_minutes: Number(row?.total_minutes ?? 0),
    late_arrivals: Number(row?.late_arrivals ?? 0),
    long_or_incomplete: Number(row?.long_or_incomplete ?? 0),
    attendance_percentage: Number(row?.attendance_percentage ?? 0),
  };
}

export async function insertCheckIn(db: Connection, userId: number, hospitalId: number) {
  const [result] = await db.query<ResultSetHeader>(
    "INSERT INTO attendance (user_id, check_in_time, hospital_id, status) VALUES (?, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+01:00'), ?, 0)",
    [userId, hospitalId],
  );
  if (!result.insertId) {
    throw new Error("Check-in was not saved to the database.");
  }
  return Number(result.insertId);
}

export async function updateCheckOut(db: Connection, status: number, id: number) {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE attendance SET status = ?, check_out_time = CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+01:00') WHERE id = ? AND check_out_time IS NULL",
    [status, id],
  );
  if (!result.affectedRows) {
    throw new Error("Check-out was not saved. The shift may already be closed.");
  }
  return Number(result.affectedRows);
}

export async function listOpenShifts(db: Connection, hospitalId: number) {
  return queryAll<
    RowDataPacket & {
      id: number;
      user_id: number;
      check_in_time: string;
      first: string | null;
      last: string | null;
      img: string | null;
      minutes_open: number;
    }
  >(
    db,
    `${FRESH_READ}
     SELECT a.id, a.user_id, a.check_in_time, u.first, u.last, u.img,
        TIMESTAMPDIFF(MINUTE, a.check_in_time, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+01:00')) AS minutes_open
     FROM attendance a
     LEFT JOIN user u ON u.user_id = a.user_id
     WHERE a.hospital_id=? AND a.check_out_time IS NULL AND a.check_in_time IS NOT NULL
     ORDER BY a.check_in_time ASC
     LIMIT 500`,
    [hospitalId],
  );
}

export async function deleteOwnOpenCheckIn(db: Connection, id: number, userId: number, hospitalId: number) {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM attendance WHERE id=? AND user_id=? AND hospital_id=? AND check_out_time IS NULL",
    [id, userId, hospitalId],
  );
  return result.affectedRows > 0;
}

export async function reopenOwnCheckOut(db: Connection, id: number, userId: number, hospitalId: number) {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE attendance SET check_out_time=NULL, status=0 WHERE id=? AND user_id=? AND hospital_id=? AND check_out_time IS NOT NULL",
    [id, userId, hospitalId],
  );
  return result.affectedRows > 0;
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
  const [result] = await db.query<ResultSetHeader>("UPDATE `privilege` SET `status`=?, `at`=CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+01:00') WHERE `id`=?", [
    status,
    id,
  ]);
  if (!result.affectedRows) {
    throw new Error("On-duty status was not updated.");
  }
}
