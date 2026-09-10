export const FACE_THRESHOLD = 0.4;

export { isoDate } from "./dates";

export function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, x) => x * x + sum, 0));
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
