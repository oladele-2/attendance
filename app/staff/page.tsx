import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { companyStaffCount, companyStaffPage } from "@/lib/queries";
import { IconCheck, IconUserPlus, IconUsers, IconXCircle } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";
import { StaffAvatar } from "@/components/StaffPhoto";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; notice?: string; q?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page || 1));
  const limit = 10;
  const offset = (page - 1) * limit;

  const { rows, total } = await withDb(async (db) => {
    const total = await companyStaffCount(db, session.company_id, q || undefined);
    const rows = await companyStaffPage(db, session.company_id, offset, limit, q || undefined);
    return { rows, total };
  });

  const pages = Math.max(1, Math.ceil(total / limit));
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconUsers />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{session.company} staff</h1>
            <p className="text-sm text-slate-500">{total} employees (patients are hidden)</p>
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
      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, or email"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
        />
        <button type="submit" className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-200">
          Search
        </button>
      </form>
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
                  {q ? (
                    <>No staff matched “{q}”.</>
                  ) : (
                    <>
                      No staff yet.{" "}
                      <Link href="/staff/new" className="font-semibold text-[#ff8002] hover:underline">
                        Add the first person
                      </Link>
                      .
                    </>
                  )}
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
                        <StaffAvatar img={row.img} name={`${row.first ?? ""} ${row.last ?? ""}`} />
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
                        <Link
                          prefetch={false}
                          href="/duty"
                          className="text-xs font-semibold text-green-700 hover:underline"
                        >
                          On duty
                        </Link>
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
            href={`/staff?page=${page - 1}${qParam}`}
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
            href={`/staff?page=${page + 1}${qParam}`}
            className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"
          >
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
