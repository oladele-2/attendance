import { Nav } from "@/components/Nav";
import { RememberFacility } from "@/components/RememberFacility";
import { getSession } from "@/lib/session";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const personName =
    session?.user_id && (session.first || session.last)
      ? `${session.first ?? ""} ${session.last ?? ""}`.trim()
      : undefined;
  const personHref = session?.user_id ? `/staff/${session.user_id}` : undefined;

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
