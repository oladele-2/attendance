import { QrCards } from "@/components/QrCards";
import { PrintIdsButton } from "@/components/PrintIdsButton";
import { requireAdmin } from "@/app/actions";
import { withDb } from "@/lib/db";
import { formatAddress } from "@/lib/brand";
import { getCompanyById, getUserById, getUserPrivileges, staffPrivilegeCount, staffPrivilegePage } from "@/lib/queries";
import Link from "next/link";

export default async function QrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = 6;
  const offset = (page - 1) * limit;

  const { cards, total, company } = await withDb(async (db) => {
    const company = await getCompanyById(db, session.company_id);
    const total = await staffPrivilegeCount(db, "Staff", session.company_id);
    const ids = await staffPrivilegePage(db, "Staff", session.company_id, offset, limit);
    const cards = [];
    for (const row of ids) {
      const user = await getUserById(db, row.user_id);
      const privilege = await getUserPrivileges(db, row.user_id, "Staff", "DISAPPROVED", session.company_id);
      if (!user) continue;
      cards.push({
        user_id: user.user_id,
        name: `${user.first} ${user.last}`.trim(),
        role: privilege?.privilege ?? "Staff",
        gender: user.gender,
        phone: user.pre && user.phone ? `+${user.pre}${user.phone}` : null,
        staffId: String(user.user_id),
        photo: user.img,
      });
    }
    return { cards, total, company };
  });

  const pages = Math.max(1, Math.ceil(total / limit));
  const facilityName = company?.name || session.company;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-3 text-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">{facilityName} staff ID cards</h2>
        <p className="max-w-xl text-sm text-slate-500">
          Printable front and back cards in the AjirMed layout. Scan the QR on the back to sign in.
        </p>
        <PrintIdsButton />
      </div>
      <QrCards
        cards={cards}
        facility={{
          name: facilityName,
          logo: company?.logo,
          website: company?.website,
          address: formatAddress([company?.house_no, company?.street, company?.city, company?.country]),
          tagline: company?.about ? company.about.replace(/<[^>]+>/g, "").slice(0, 80) : null,
        }}
      />
      <div className="mt-6 flex justify-center gap-3 print:hidden">
        {page > 1 ? (
          <Link href={`/qrcodes?page=${page - 1}`} className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
            Previous
          </Link>
        ) : null}
        <span className="px-3 py-1.5 text-sm text-slate-500">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={`/qrcodes?page=${page + 1}`} className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
