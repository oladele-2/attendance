export function actionDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const now = new Date();
  let diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (diff < 0) {
    diff = Math.abs(diff);
    if (diff < 60) return "In a few seconds";
    if (diff < 3600) return `In ${Math.floor(diff / 60)} mins`;
    if (diff < 86400) return `In ${Math.floor(diff / 3600)} hrs`;
    return `On ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ${time}`;
  }
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  if (diff < 172800) return `Yesterday ${time}`;
  if (diff < 604800) {
    return `${date.toLocaleDateString(undefined, { weekday: "long" })} ${time}`;
  }
  if (now.getFullYear() === date.getFullYear()) {
    return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`;
  }
  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ${time}`;
}

export function formatLongDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function formatMonthTitle(month: string) {
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function minutesToHm(total: number | null | undefined) {
  const mins = Number(total ?? 0);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function isoDateValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
