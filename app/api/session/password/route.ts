import {
  companyAllowsLogin,
  isEmail,
  isPhone,
  userApproved,
  verifyPhpPassword,
} from "@/lib/auth";
import { withDb } from "@/lib/db";
import { getCompanyById, getUserByEmail, getUserByPhone, getUserPrivileges } from "@/lib/queries";
import { sessionFromCookieHeader, facilityCookieHeader, userCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  const session = await sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session?.company_id) {
    return Response.redirect(new URL("/passcode?error=session", request.url), 303);
  }

  const form = await request.formData();
  const identifier = String(form.get("member_email") ?? "").trim();
  const password = String(form.get("member_password") ?? "");

  if (!identifier || !password) {
    return Response.redirect(new URL("/signin?error=missing-details", request.url), 303);
  }

  try {
    const user = await withDb(async (db) => {
      if (isEmail(identifier)) return getUserByEmail(db, identifier);
      if (isPhone(identifier)) return getUserByPhone(db, identifier);
      return null;
    });

    if (!user || !user.last || !user.pass || !verifyPhpPassword(password, user.last, user.pass)) {
      return Response.redirect(new URL("/signin?error=invalid-login", request.url), 303);
    }
    if (!userApproved(user)) {
      return Response.redirect(
        new URL(
          `/signin?error=${encodeURIComponent(`Your account is currently marked as: ${user.status}. Contact support.`)}`,
          request.url,
        ),
        303,
      );
    }

    const privileges = await withDb(async (db) => {
      const priv = await getUserPrivileges(db, user.user_id, "Staff", "DISAPPROVED", session.company_id);
      const company = await getCompanyById(db, session.company_id);
      if (!priv || !company || !companyAllowsLogin(company)) return null;
      return priv;
    });

    if (!privileges) {
      return Response.redirect(new URL("/signin?error=no-access", request.url), 303);
    }

    const next = {
      ...session,
      user_id: user.user_id,
      first: user.first,
      last: user.last,
      privilege: privileges.privilege,
      privilege_id: privileges.id,
    };
    const headers = new Headers();
    headers.set("Location", "/verification");
    headers.append("Set-Cookie", await facilityCookieHeader(next));
    headers.append("Set-Cookie", await userCookieHeader(next));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[password-session]", message);
    return Response.redirect(
      new URL(`/signin?error=${encodeURIComponent(`db:${message.slice(0, 160)}`)}`, request.url),
      303,
    );
  }
}
