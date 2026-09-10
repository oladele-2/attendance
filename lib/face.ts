import { parseDateTime } from "./dates";

export const FACE_THRESHOLD = 0.4;

export function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  if (norm === 0) return vector;
  return vector.map((x) => x / norm);
}

export function euclideanDistance(a: number[], b: number[]) {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function parseFaceVector(raw: string): number[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 128) return null;
    if (!parsed.every((n) => typeof n === "number")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isoDate(d: Date | string | number | null | undefined = new Date()) {
  const date = parseDateTime(d);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  if (Number.isNaN(local.getTime())) return "";
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
