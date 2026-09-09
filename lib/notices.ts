export const NOTICE_COPY: Record<string, string> = {
  updated: "Attendance record saved.",
  deleted: "Attendance record deleted.",
  "checked-in": "You are checked in.",
  "checked-out": "You are checked out.",
  "face-saved": "Face template saved.",
};

export const ERROR_COPY: Record<string, string> = {
  "invalid-passcode": "That attendance passcode is not valid. Check with your administrator.",
  "missing-details": "Please enter your email or phone and password.",
  "invalid-login": "The details you entered do not match our records.",
  "no-access": "We could not find active access for your account at this facility.",
  "account-status": "Your account is not approved. Contact support.",
  "ceo-only": "Only the CEO can edit or delete attendance records.",
  "admin-only": "Only Admin or CEO can open this page.",
  "not-found": "That record was not found, or it belongs to another facility.",
  "invalid-times": "Check-in time is required. Check-out must be after check-in.",
  "session": "Your session expired. Please sign in again.",
  "db": "We could not reach the database. Try again in a moment.",
  "no-permission": "You do not have permission to do that.",
};

export function noticeMessage(code?: string) {
  if (!code) return "";
  return NOTICE_COPY[code] ?? code.replace(/-/g, " ");
}

export function errorMessage(code?: string) {
  if (!code) return "";
  return ERROR_COPY[code] ?? decodeURIComponent(code);
}
