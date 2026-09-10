import { env } from "cloudflare:workers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

export const COOKIE = "attendance_session";

function sessionSecret() {
  let secret: string | undefined;
  try {
    // Use static property access — some Workers tooling breaks env[name] dynamic reads.
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
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
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

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decryptSession(jar.get(COOKIE)?.value);
}

export async function setSession(payload: SessionPayload) {
  const jar = await cookies();
  const token = await encryptSession(payload);
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function sessionCookieHeader(token: string) {
  const maxAge = 60 * 60 * 24 * 14;
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function isAdmin(session: SessionPayload | null) {
  return session?.privilege === "CEO" || session?.privilege === "Admin";
}
