import bcrypt from "bcryptjs";
import { env } from "cloudflare:workers";
import type { CompanyRow, UserRow } from "./types";
import { COMPANY_OK_STATUSES } from "./types";

export function verifyPhpPassword(plain: string, lastName: string, hash: string) {
  let pepper = "";
  try {
    const fromEnv = env.PASSWORD_PEPPER;
    if (typeof fromEnv === "string") pepper = fromEnv;
  } catch {
    pepper = "";
  }
  if (!pepper) pepper = process.env.PASSWORD_PEPPER || "";
  const salted = `${plain}${lastName}${pepper}`;
  const normalized = hash.replace(/^\$2y\$/, "$2a$");
  return bcrypt.compareSync(salted, normalized);
}

export function companyAllowsLogin(company: CompanyRow) {
  return company.type === "HEALTHCARE" && COMPANY_OK_STATUSES.includes(company.status as (typeof COMPANY_OK_STATUSES)[number]);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value: string) {
  return /^\+?[0-9]{6,15}$/.test(value);
}

export function userApproved(user: UserRow) {
  return user.status === "APPROVED";
}
