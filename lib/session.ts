import { env } from "cloudflare:workers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { SessionPayload } from "./types";

export const COOKIE = "attendance_session";
export const FACILITY_COOKIE = "attendance_facility";

const USER_MAX_AGE = 60 * 60 * 24 * 14;
const FACILITY_MAX_AGE = 60 * 60 * 24 * 365 * 10;

let encodedSecret: Uint8Array | undefined;

function sessionSecret() {
  if (encodedSecret) return encodedSecret;
  let secret: string | undefined;
  try {
    const fromEnv = env.SESSION_SECRET;
    if (typeof fromEnv === "string" && fromEnv.length > 0) secret = fromEnv;
  } catch {
    secret = undefined;
  }
  if (!secret) {
    const fromProcess = process.env.SESSION_SECRET;
    if (typeof fromProcess === "string" && fromProcess.length > 0) secret = fromProcess;
  }
  if (!secret) {
    throw new Error("SESSION_SECRET is not set on this Worker");
  }
  encodedSecret = new TextEncoder().encode(secret);
  return encodedSecret;
}

function tokenFromCookieHeader(header: string | null | undefined, name: string) {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieHeader(name: string, token: string, maxAge: number) {
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function expiredCookieHeader(name: string) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function mergeSession(
  facility: SessionPayload | null,
  user: SessionPayload | null,
): SessionPayload | null {
  const company_id = user?.company_id ?? facility?.company_id;
  if (!company_id) return null;
  return {
    company_id,
    company: user?.company || facility?.company || "",
    user_id: user?.user_id,
    first: user?.first,
    last: user?.last,
    privilege: user?.privilege,
    privilege_id: user?.privilege_id,
    last_attempt: user?.last_attempt,
  };
}

export async function encryptSession(payload: SessionPayload, maxAgeSeconds = USER_MAX_AGE) {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.max(60, maxAgeSeconds)}s`)
    .sign(sessionSecret());
}

export async function decryptSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function sessionFromCookieHeader(header: string | null | undefined): Promise<SessionPayload | null> {
  const user = await decryptSession(tokenFromCookieHeader(header, COOKIE));
  const facility = await decryptSession(tokenFromCookieHeader(header, FACILITY_COOKIE));
  return mergeSession(facility, user);
}

async function readSession(): Promise<SessionPayload | null> {
  let header: string | null = null;
  try {
    header = (await headers()).get("cookie");
  } catch {
    header = null;
  }
  if (header != null) {
    return sessionFromCookieHeader(header);
  }
  try {
    const jar = await cookies();
    const user = await decryptSession(jar.get(COOKIE)?.value);
    const facility = await decryptSession(jar.get(FACILITY_COOKIE)?.value);
    return mergeSession(facility, user);
  } catch {
    return null;
  }
}

/** Per-request memoization only — not page/data/Hyperdrive cache. */
export const getSession = cache(readSession);

export async function setSession(payload: SessionPayload) {
  const jar = await cookies();
  const facilityToken = await encryptSession(
    { company_id: payload.company_id, company: payload.company },
    FACILITY_MAX_AGE,
  );
  jar.set(FACILITY_COOKIE, facilityToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    maxAge: FACILITY_MAX_AGE,
  });
  if (payload.user_id) {
    const userToken = await encryptSession(payload, USER_MAX_AGE);
    jar.set(COOKIE, userToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: USER_MAX_AGE,
    });
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function sessionCookieHeader(token: string) {
  return cookieHeader(COOKIE, token, USER_MAX_AGE);
}

export async function facilityCookieHeader(payload: Pick<SessionPayload, "company_id" | "company">) {
  const token = await encryptSession({ company_id: payload.company_id, company: payload.company }, FACILITY_MAX_AGE);
  return cookieHeader(FACILITY_COOKIE, token, FACILITY_MAX_AGE);
}

export async function userCookieHeader(payload: SessionPayload) {
  const token = await encryptSession(payload, USER_MAX_AGE);
  return cookieHeader(COOKIE, token, USER_MAX_AGE);
}

export function isAdmin(session: SessionPayload | null) {
  return session?.privilege === "CEO" || session?.privilege === "Admin";
}
