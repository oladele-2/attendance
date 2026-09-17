import { QrCards } from "@/components/QrCards";
import { PrintIdsButton } from "@/components/PrintIdsButton";
import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { formatAddress } from "@/lib/brand";
import { companyStaffAll, companyStaffCount, companyStaffPage, getCompanyById } from "@/lib/queries";
import Link from "next/link";

export default async function QrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = 5;
  const offset = (page - 1) * limit;

  const { cards, allCards, total, company } = await withDb(async (db) => {
    const company = await getCompanyById(db, session.company_id);
    const total = await companyStaffCount(db, session.company_id);
    const [rows, allRows] = await Promise.all([
      companyStaffPage(db, session.company_id, offset, limit),
      companyStaffAll(db, session.company_id),
    ]);
    const toCards = (staffRows: typeof rows) => staffRows.flatMap((row) => {
      if (!row.user_id) return [];
      return [{
        user_id: row.user_id,
        name: `${row.first ?? ""} ${row.last ?? ""}`.trim(),
        role: row.privilege || "Staff",
        gender: row.gender,
        phone: row.pre && row.phone ? `+${row.pre}${row.phone}` : null,
        staffId: String(row.user_id),
        photo: row.img,
      }];
    });
    return { cards: toCards(rows), allCards: toCards(allRows), total, company };
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
      <div className="print:hidden">
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
      </div>
      <div className="hidden print:block">
        <QrCards
          cards={allCards}
          facility={{
            name: facilityName,
            logo: company?.logo,
            website: company?.website,
            address: formatAddress([company?.house_no, company?.street, company?.city, company?.country]),
            tagline: company?.about ? company.about.replace(/<[^>]+>/g, "").slice(0, 80) : null,
          }}
        />
      </div>
      <div className="mt-6 flex justify-center gap-3 print:hidden">
        {page > 1 ? (
          <Link
            prefetch={false}
            href={`/qrcodes?page=${page - 1}`}
            className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"
          >
            Previous
          </Link>
        ) : null}
        <span className="px-3 py-1.5 text-sm text-slate-500">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link
            prefetch={false}
            href={`/qrcodes?page=${page + 1}`}
            className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"
          >
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
