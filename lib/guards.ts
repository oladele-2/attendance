import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function requireUser() {
  const session = await getSession();
  if (!session?.company_id) redirect("/passcode");
  if (!session.user_id) redirect("/scan");
  return session;
}

export async function requireFacility() {
  const session = await getSession();
  if (!session?.company_id) redirect("/passcode");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.privilege !== "CEO" && session.privilege !== "Admin") {
    redirect("/?error=admin-only");
  }
  return session;
}
