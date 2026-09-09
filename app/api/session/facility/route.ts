import { getCompanyById } from "@/lib/queries";
import { withDb } from "@/lib/db";
import { encryptSession, sessionCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const raw = String(form.get("facility_id") ?? "").trim();
  if (!/^\d+$/.test(raw)) {
    return Response.redirect(new URL("/passcode?error=invalid-passcode", request.url), 303);
  }
  const facilityId = Number.parseInt(raw, 10);

  if (!Number.isFinite(facilityId)) {
    return Response.redirect(new URL("/passcode?error=invalid-passcode", request.url), 303);
  }

  let facility;
  try {
    facility = await withDb((db) => getCompanyById(db, facilityId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[facility-session]", message);
    return Response.redirect(
      new URL(`/passcode?error=${encodeURIComponent(`db:${message.slice(0, 160)}`)}`, request.url),
      303,
    );
  }

  if (!facility) {
    return Response.redirect(new URL("/passcode?error=invalid-passcode", request.url), 303);
  }

  try {
    const token = await encryptSession({
      company_id: facility.id,
      company: facility.name,
    });
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/scan",
        "Set-Cookie": sessionCookieHeader(token),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[facility-session]", message);
    return Response.redirect(
      new URL(`/passcode?error=${encodeURIComponent(`session:${message.slice(0, 120)}`)}`, request.url),
      303,
    );
  }
}
