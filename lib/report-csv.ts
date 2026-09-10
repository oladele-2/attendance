import { clockTimeValue, isoDateValue } from "./dates";
import type { AttendanceRow } from "./types";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function attendanceCsv(rows: AttendanceRow[]) {
  const header = ["Staff", "Date", "Check in", "Check out", "Status", "Hours"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(`${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.user_id),
        csvCell(isoDateValue(row.attendance_date ?? row.check_in_time)),
        csvCell(clockTimeValue(row.check_in_time)),
        csvCell(row.check_out_time ? clockTimeValue(row.check_out_time) : "Not signed out"),
        csvCell(row.status_text ?? ""),
        csvCell(row.hours_worked ?? ""),
      ].join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function attendanceExportPath(params: {
  staff?: number;
  date?: string;
  month?: string;
  format: "csv" | "excel";
}) {
  const query = new URLSearchParams();
  if (params.staff) query.set("staff", String(params.staff));
  if (params.date) query.set("date", params.date);
  if (params.month) query.set("month", params.month);
  query.set("format", params.format);
  return `/api/reports/attendance?${query.toString()}`;
}
