import { withDb } from "@/lib/db";
import { getUserById } from "@/lib/queries";
import { punchAttendance } from "@/lib/attendance";
import { euclideanDistance, FACE_THRESHOLD, normalizeVector, parseFaceVector } from "@/lib/face";
import { decryptSession, encryptSession, sessionCookieHeader } from "@/lib/session";

function readSessionCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)attendance_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request: Request) {
  const session = await decryptSession(readSessionCookie(request));
  if (!session?.user_id || !session.privilege_id || !session.company_id) {
    return Response.json(
      { success: false, status_code: 401, message: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const elapsed = Date.now() / 1000 - (session.last_attempt ?? 0);
  if (elapsed < 3) {
    return Response.json(
      {
        success: false,
        status_code: 429,
        message: "Please wait a few seconds before trying again.",
      },
      { status: 429 },
    );
  }

  let body: { face_vector?: number[] } = {};
  try {
    body = (await request.json()) as { face_vector?: number[] };
  } catch {
    body = {};
  }

  const liveFace =
    Array.isArray(body.face_vector) &&
    body.face_vector.length === 128 &&
    body.face_vector.every(Number.isFinite)
      ? body.face_vector
      : null;
  const nextSession = { ...session, last_attempt: Math.floor(Date.now() / 1000) };

  try {
    const result = await withDb(async (db) => {
      if (liveFace) {
        const user = await getUserById(db, session.user_id!);
        const stored = user?.face_vector ? parseFaceVector(user.face_vector) : null;
        if (!stored) {
          return {
            success: false as const,
            status_code: 404,
            message:
              "No face template is saved for you yet. Use Check-in / Check-out instead, or ask an admin to register your face.",
          };
        }
        const distance = euclideanDistance(normalizeVector(liveFace), normalizeVector(stored));
        if (distance > FACE_THRESHOLD) {
          return {
            success: false as const,
            status_code: 403,
            message: "Face did not match. Try again, or use Check-in / Check-out without the camera.",
          };
        }
      }

      const punch = await punchAttendance(db, session.user_id!, session.company_id, session.privilege_id!);
      if (!punch.success) {
        return { success: false as const, status_code: 409, message: punch.message };
      }
      const viaFace = liveFace ? "Face verified. " : "";
      return {
        success: true as const,
        status_code: 200,
        message: `${viaFace}${punch.action}${punch.note}.`,
      };
    });

    const token = await encryptSession(nextSession);
    return Response.json(result, {
      status: result.status_code,
      headers: {
        "Set-Cookie": sessionCookieHeader(token),
      },
    });
  } catch {
    return Response.json({
      success: false,
      status_code: 500,
      message: "We could not save attendance right now. Try again in a moment.",
    });
  }
}
