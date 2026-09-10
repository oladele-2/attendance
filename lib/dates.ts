export const APP_TZ = "Africa/Lagos";
export const APP_TZ_OFFSET = "+01:00";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const lagosFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function lagosParts(date: Date) {
  const parts = lagosFmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: get("minute"),
  };
}

/** Parse MySQL DATETIME as Africa/Lagos wall time (no DST). */
export function parseDateTime(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value).trim();
  if (!raw || raw === "[object Object]") return null;
  const mysql = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (mysql) {
    const date = new Date(`${mysql[1]}T${mysql[2]}${APP_TZ_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asDate(value: string | Date | null | undefined): Date | null {
  return parseDateTime(value);
}

function clock(date: Date) {
  const { hour, minute } = lagosParts(date);
  const ampm = hour >= 12 ? "PM" : "AM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}:${minute} ${ampm}`;
}

function shortDay(date: Date) {
  const { year, month, day } = lagosParts(date);
  return `${year}-${month}-${day}`;
}

export function isoDate(d: Date | string | number | null | undefined = new Date()) {
  const date = d instanceof Date || d == null ? (d ?? new Date()) : parseDateTime(d);
  if (!date || Number.isNaN(date.getTime())) return "";
  return shortDay(date);
}

export function lagosClockNow() {
  return clock(new Date());
}

export function actionDate(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return value == null ? "" : String(value);
  const now = new Date();
  let diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  const time = clock(date);

  if (diff < 0) {
    diff = Math.abs(diff);
    if (diff < 60) return "In a few seconds";
    if (diff < 3600) return `In ${Math.floor(diff / 60)} mins`;
    if (diff < 86400) return `In ${Math.floor(diff / 3600)} hrs`;
    return `On ${shortDay(date)} ${time}`;
  }
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  if (diff < 172800) return `Yesterday ${time}`;
  return `${shortDay(date)} ${time}`;
}

export function formatLongDate(iso: string) {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatMonthTitle(month: string) {
  const match = String(month).match(/^(\d{4})-(\d{2})/);
  if (!match) return month;
  const name = MONTHS[Number(match[2]) - 1];
  if (!name) return month;
  return `${name} ${match[1]}`;
}

export function minutesToHm(total: number | null | undefined) {
  const mins = Number(total ?? 0);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Format a MySQL DATETIME already stored as Africa/Lagos, without Intl. */
export function mysqlLagosStamp(value: unknown) {
  const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return "";
  let hour = Number(match[2]);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${match[1]} ${hour}:${match[3]} ${ampm}`;
}

export function isoDateValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = parseDateTime(value);
  if (!date) return "";
  return shortDay(date);
}

export function clockTimeValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}${match[3] ? `:${match[3]}` : ""}`;
}

export function currentMonthIso(value: Date = new Date()) {
  const { year, month } = lagosParts(value);
  return `${year}-${month}`;
}
