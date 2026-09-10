export const FACILITY_STORAGE_KEY = "ajirmed_facility";

export type StoredFacility = { id: number; name: string };

export function readStoredFacility(): StoredFacility | null {
  try {
    const raw = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFacility;
    if (!parsed || !Number.isFinite(parsed.id) || parsed.id <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredFacility(id: number, name: string) {
  try {
    localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify({ id, name }));
  } catch {
    // private mode / quota
  }
}

export function clearStoredFacility() {
  try {
    localStorage.removeItem(FACILITY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
