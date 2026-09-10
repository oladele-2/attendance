import { withDb } from "@/lib/db";
import { getUserFaceVector } from "@/lib/queries";
import { punchAttendance, undoAttendance, UNDO_SECONDS } from "@/lib/attendance";
import { lagosClockNow } from "@/lib/dates";
import { euclideanDistance, FACE_THRESHOLD, normalizeVector, parseFaceVector } from "@/lib/face";
import { sessionFromCookieHeader, userCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  const session = await sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session?.user_id || !session.privilege_id || !session.company_id) {
    return Response.json(
      { success: false, status_code: 401, message: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }

  let body: { face_vector?: number[]; undo?: boolean; attendanceId?: number } = {};
  try {
    body = (await request.json()) as { face_vector?: number[]; undo?: boolean; attendanceId?: number };
  } catch {
    body = {};
  }

  const isUndo = Boolean(body.undo && body.attendanceId);
  const elapsed = Date.now() / 1000 - (session.last_attempt ?? 0);
  if (!isUndo && elapsed < 3) {
    return Response.json(
      {
        success: false,
        status_code: 429,
        message: "Please wait a few seconds before trying again.",
      },
      { status: 429 },
    );
  }

  const liveFace =
    !isUndo &&
    Array.isArray(body.face_vector) &&
    body.face_vector.length === 128 &&
    body.face_vector.every(Number.isFinite)
      ? body.face_vector
      : null;
  const nextSession = { ...session, last_attempt: Math.floor(Date.now() / 1000) };

  try {
    const result = await withDb(async (db) => {
      if (isUndo) {
        const undone = await undoAttendance(
          db,
          session.user_id!,
          session.company_id,
          session.privilege_id!,
          Number(body.attendanceId),
        );
        return {
          success: true as const,
          status_code: 200,
          message:
            undone.action === "undid-checkout"
              ? "Check-out undone. You are on duty again."
              : "Check-in undone. You are not marked present.",
          action: undone.action,
          attendanceId: Number(body.attendanceId),
        };
      }

      if (liveFace) {
        const user = await getUserFaceVector(db, session.user_id!);
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
      const viaFace = liveFace ? "Face verified. " : "";
      const clock = lagosClockNow();
      const signedOut = punch.action === "Checked out";
      return {
        success: true as const,
        status_code: 200,
        message: signedOut
          ? `${viaFace}You checked out at ${clock} (Africa/Lagos)${punch.note}. You can undo for 2 minutes.`
          : `${viaFace}You checked in at ${clock} (Africa/Lagos). You can undo for 2 minutes.`,
        action: punch.action,
        attendanceId: punch.attendanceId,
        undoSeconds: UNDO_SECONDS,
      };
    });

    const headers = new Headers();
    if (result.success) {
      headers.append("Set-Cookie", await userCookieHeader(nextSession));
    }

    return Response.json(result, {
      status: result.status_code,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[verify-face]", message);
    return Response.json(
      {
        success: false,
        status_code: 500,
        message:
          message.startsWith("Check-") ||
          message.startsWith("On-duty") ||
          message.startsWith("The undo") ||
          message.startsWith("That punch")
            ? message
            : "We could not save attendance right now. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
