export const NOTICE_COPY: Record<string, string> = {
  updated: "Attendance record saved.",
  deleted: "Attendance record deleted.",
  "checked-in": "You are checked in.",
  "checked-out": "You are checked out.",
  "face-saved": "Face template saved.",
  "staff-added": "Staff account created. Register a face if they will use face check-in.",
  "staff-linked": "This person already has an AjirMed account. They can now sign in at this facility.",
  "shift-closed": "Open shift closed (checked out).",
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
  "staff-exists": "That person already has access at this facility.",
  "email-taken": "That email already belongs to someone else. Use a different email, or leave password blank only when linking an existing account.",
  "phone-taken": "That phone number already belongs to a different account.",
  "weak-password": "Password must be at least 8 characters and match the confirmation.",
  "missing-staff": "First name, last name, email, phone, and gender are required.",
  "role-forbidden": "Only the CEO can assign Admin or CEO access.",
};

export function noticeMessage(code?: string) {
  if (!code) return "";
  return NOTICE_COPY[code] ?? code.replace(/-/g, " ");
}

export function errorMessage(code?: string) {
  if (!code) return "";
  if (code.startsWith("db:")) {
    return `Database error: ${code.slice(3)}`;
  }
  if (code.startsWith("session:")) {
    return `Session error: ${code.slice(8)}`;
  }
  return ERROR_COPY[code] ?? decodeURIComponent(code);
}
