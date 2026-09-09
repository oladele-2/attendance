import { env } from "cloudflare:workers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

const COOKIE = "attendance_session";

function secretKey() {
  let secret: string | undefined;
  try {
    secret = env.SESSION_SECRET;
  } catch {
    secret = undefined;
  }
  secret = secret || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function decryptSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
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
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function isAdmin(session: SessionPayload | null) {
  return session?.privilege === "CEO" || session?.privilege === "Admin";
}
