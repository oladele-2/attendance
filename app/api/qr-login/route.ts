import { userApproved, companyAllowsLogin } from "@/lib/auth";
import { withDb } from "@/lib/db";
import { getCompanyById, getUserById, getUserPrivileges } from "@/lib/queries";
import { getSession, setSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.company_id) {
    return Response.json(
      { success: false, message: "Enter the facility passcode first, then scan again." },
      { status: 401 },
    );
  }

  let body: { user_id?: number };
  try {
    body = (await request.json()) as { user_id?: number };
  } catch {
    return Response.json({ success: false, message: "Invalid request: user_id missing" });
  }
  if (!body.user_id) {
    return Response.json({ success: false, message: "Invalid request: user_id missing" });
  }

  try {
    const result = await withDb(async (db) => {
      const user = await getUserById(db, Number(body.user_id));
      if (!user) return { success: false as const, message: "That QR code does not match a staff member." };
      if (!userApproved(user)) {
        return {
          success: false as const,
          message: `This account is currently marked as: ${user.status}. Contact support.`,
        };
      }
      const privileges = await getUserPrivileges(db, user.user_id, "Staff", "DISAPPROVED", session.company_id);
      const company = await getCompanyById(db, session.company_id);
      if (!privileges) {
        return { success: false as const, message: "This QR code has no access at this facility." };
      }
      if (!company || !companyAllowsLogin(company)) {
        return { success: false as const, message: "This facility cannot take attendance right now. Contact support." };
      }
      return { success: true as const, user, privileges };
    });

    if (!result.success) {
      return Response.json({ success: false, message: result.message });
    }

    await setSession({
      ...session,
      user_id: result.user.user_id,
      first: result.user.first,
      last: result.user.last,
      privilege: result.privileges.privilege,
      privilege_id: result.privileges.id,
    });

    return Response.json({
      success: true,
      message: `Login successful. Welcome ${result.user.first}`,
      redirect: "/verification",
    });
  } catch {
    return Response.json({
      success: false,
      message: "We could not complete QR login. Try again or use email and password.",
    });
  }
}
