import { withDb } from "@/lib/db";
import { getPrivilegeAtCompany, getUserById, updateFaceVector } from "@/lib/queries";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user_id || !session.company_id) {
    return Response.json(
      { success: false, message: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }
  if (session.privilege !== "CEO" && session.privilege !== "Admin") {
    return Response.json(
      { success: false, message: "Only Admin or CEO can save a face template." },
      { status: 403 },
    );
  }

  let body: { user_id?: number; face_vector?: number[] };
  try {
    body = (await request.json()) as { user_id?: number; face_vector?: number[] };
  } catch {
    return Response.json({ success: false, message: "The face data was incomplete. Hold still and try again." });
  }
  if (!body.user_id || !Array.isArray(body.face_vector) || body.face_vector.length !== 128) {
    return Response.json({ success: false, message: "No clear face was captured. Look at the camera and try again." });
  }

  try {
    const allowed = await withDb(async (db) => {
      const user = await getUserById(db, Number(body.user_id));
      if (!user) return { ok: false as const, message: "That staff member was not found." };
      const privilege = await getPrivilegeAtCompany(db, user.user_id, session.company_id);
      if (!privilege) {
        return { ok: false as const, message: "That staff member does not belong to this facility." };
      }
      await updateFaceVector(db, JSON.stringify(body.face_vector), user.user_id);
      return { ok: true as const };
    });
    if (!allowed.ok) {
      return Response.json({ success: false, message: allowed.message });
    }
    return Response.json({ success: true, message: "Face template saved. This staff member can now use face check-in." });
  } catch {
    return Response.json({
      success: false,
      message: "We could not save the face template. Try again in a moment.",
    });
  }
}
