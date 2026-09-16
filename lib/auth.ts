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
  const normalized = hash.replace(/^\$2y\$/, "$2a$");
  // Ajirmed switched to bcrypt(password) for user_id > 158924. Accept both
  // formats because older hashes still include the surname and PHP $obe.
  return (
    bcrypt.compareSync(plain, normalized) ||
    bcrypt.compareSync(`${plain}${lastName}${passwordPepper()}`, normalized)
  );
}

/** New accounts use standard bcrypt; existing PHP hashes remain valid at login. */
export function hashPassword(plain: string) {
  const hash = bcrypt.hashSync(plain, 10);
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
