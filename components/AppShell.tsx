import { Nav } from "@/components/Nav";
import { RememberFacility } from "@/components/RememberFacility";
import { getSession } from "@/lib/session";
import { withDb } from "@/lib/db";
import { getUserById } from "@/lib/queries";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let personName: string | undefined;
  let personHref: string | undefined;
  if (session?.user_id) {
    const user = await withDb((db) => getUserById(db, session.user_id!)).catch(() => null);
    if (user) {
      personName = `${user.first} ${user.last}`;
      personHref = user.friendly ? `/staff/${user.friendly}` : undefined;
    }
  }

  return (
    <>
      <RememberFacility companyId={session?.company_id} companyName={session?.company} />
      {session?.company_id ? (
        <Nav
          company={session.company}
          personName={personName}
          personHref={personHref}
          privilege={session.privilege}
          loggedIn={Boolean(session.user_id)}
        />
      ) : null}
      {children}
    </>
  );
}
