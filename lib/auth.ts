import bcrypt from "bcryptjs";
import { env } from "cloudflare:workers";
import type { CompanyRow, UserRow } from "./types";
import { COMPANY_OK_STATUSES } from "./types";

function passwordPepper() {
  try {
    const fromEnv = env.PASSWORD_PEPPER;
    if (typeof fromEnv === "string") return fromEnv;
  } catch {
    /* cloudflare:workers unavailable */
  }
  return process.env.PASSWORD_PEPPER || "";
}

export function verifyPhpPassword(plain: string, lastName: string, hash: string) {
  const salted = `${plain}${lastName}${passwordPepper()}`;
  const normalized = hash.replace(/^\$2y\$/, "$2a$");
  return bcrypt.compareSync(salted, normalized);
}

/** Same scheme as PHP: bcrypt(password + lastName + pepper), stored as $2y$. */
export function hashPhpPassword(plain: string, lastName: string) {
  const hash = bcrypt.hashSync(`${plain}${lastName}${passwordPepper()}`, 10);
  return hash.replace(/^\$2a\$/, "$2y$").replace(/^\$2b\$/, "$2y$");
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
