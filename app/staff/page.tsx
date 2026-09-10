import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { companyStaffCount, companyStaffPage } from "@/lib/queries";
import { IconCheck, IconUser, IconUserPlus, IconUsers, IconXCircle } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; notice?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = 10;
  const offset = (page - 1) * limit;

  const { rows, total } = await withDb(async (db) => {
    const total = await companyStaffCount(db, session.company_id);
    const rows = await companyStaffPage(db, session.company_id, offset, limit);
    return { rows, total };
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconUsers />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{session.company} staff</h1>
            <p className="text-sm text-slate-500">{total} people with access at this facility</p>
          </div>
        </div>
        <Link
          href="/staff/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff8002] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d98324]"
        >
          <IconUserPlus size={16} />
          Add staff
        </Link>
      </div>
      <FlashBanner notice={params.notice} error={params.error} />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4">Staff</th>
              <th className="p-4">Role</th>
              <th className="p-4">Face</th>
              <th className="p-4">Shift</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No staff yet.{" "}
                  <Link href="/staff/new" className="font-semibold text-[#ff8002] hover:underline">
                    Add the first person
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              rows.map((row) =>
                row.user_id ? (
                  <tr key={row.user_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <Link
                        prefetch={false}
                        href={`/staff/${row.friendly || row.user_id}`}
                        className="inline-flex items-center gap-2 font-medium text-[#ff8002] hover:underline"
                      >
                        <IconUser size={16} />
                        {row.first} {row.last}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-600">{row.privilege || "Staff"}</td>
                    <td className="p-4">
                      {Number(row.has_face) > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          <IconCheck size={12} /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                          <IconXCircle size={12} /> Not registered
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {row.status === "Staff" ? (
                        <span className="text-xs font-semibold text-green-700">On duty</span>
                      ) : (
                        <span className="text-xs text-slate-500">Off duty</span>
                      )}
                    </td>
                  </tr>
                ) : null,
              )
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {page > 1 ? (
          <Link
            prefetch={false}
            href={`/staff?page=${page - 1}`}
            className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"
          >
            Prev
          </Link>
        ) : null}
        <span className="px-3 py-1.5 text-sm text-slate-600">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link
            prefetch={false}
            href={`/staff?page=${page + 1}`}
            className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"
          >
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
