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
  return queryOne<RowDataPacket & AttendanceRow>(
    db,
    `${FRESH_READ}
     SELECT id, user_id, ${DAY_EXPR()} AS attendance_date, check_in_time, check_out_time, hospital_id, status
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
    `${FRESH_READ}
     SELECT COUNT(*) AS total FROM \`attendance\`
     WHERE user_id=? AND hospital_id=? AND ${DAY_EXPR()}=?`,
    [userId, hospitalId, today],
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
) {
  const col = alias ? `${alias}.` : "";
  const day = DAY_EXPR(alias);
  let sql = ` WHERE ${col}hospital_id=?`;
  const params: unknown[] = [company];
  if (staff) {
    sql += ` AND ${col}user_id=?`;
    params.push(staff);
  }
  if (month) {
    const [year, mon] = month.split("-");
    sql += ` AND YEAR(${day})=? AND MONTH(${day})=?`;
    params.push(Number(year), Number(mon));
  } else if (date) {
    sql += ` AND ${day}=?`;
    params.push(date);
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
) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const filter = attendanceFilter(company, staff, date, month, "a");
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

export async function insertCheckIn(db: Connection, userId: number, hospitalId: number) {
  const [result] = await db.query<ResultSetHeader>(
    "INSERT INTO attendance (user_id, check_in_time, hospital_id, status) VALUES (?, NOW(), ?, 0)",
    [userId, hospitalId],
  );
  if (!result.insertId) {
    throw new Error("Check-in was not saved to the database.");
  }
  return Number(result.insertId);
}

export async function updateCheckOut(db: Connection, status: number, id: number) {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE attendance SET status = ?, check_out_time = NOW() WHERE id = ? AND check_out_time IS NULL",
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
      pre: string | null;
      phone: string | null;
      privilege: string | null;
      minutes_open: number;
    }
  >(
    db,
    `${FRESH_READ}
     SELECT a.id, a.user_id, a.check_in_time, u.first, u.last, u.img, u.pre, u.phone,
        p.privilege, TIMESTAMPDIFF(MINUTE, a.check_in_time, NOW()) AS minutes_open
     FROM attendance a
     LEFT JOIN user u ON u.user_id = a.user_id
     LEFT JOIN privilege p ON CAST(TRIM(p.user_id) AS UNSIGNED) = a.user_id AND p.company = a.hospital_id
     WHERE a.hospital_id=? AND a.check_in_time IS NOT NULL AND a.check_out_time IS NULL
     ORDER BY a.check_in_time ASC`,
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
  const [result] = await db.query<ResultSetHeader>("UPDATE `privilege` SET `status`=?, `at`=now() WHERE `id`=?", [
    status,
    id,
  ]);
  if (!result.affectedRows) {
    throw new Error("On-duty status was not updated.");
  }
}
