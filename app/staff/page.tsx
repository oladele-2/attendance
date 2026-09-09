import Link from "next/link";
import { requireAdmin } from "@/app/actions";
import { withDb } from "@/lib/db";
import { getUserById, getUserPrivileges, staffPrivilegeCount, staffPrivilegePage } from "@/lib/queries";
import { IconCheck, IconUser, IconUsers, IconXCircle } from "@/components/icons";
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
    const total = await staffPrivilegeCount(db, "Staff", session.company_id);
    const ids = await staffPrivilegePage(db, "Staff", session.company_id, offset, limit);
    const rows = await Promise.all(
      ids.map(async (row) => {
        const staff = await getUserById(db, row.user_id);
        const privilege = await getUserPrivileges(db, row.user_id, "Staff", "DISAPPROVED", session.company_id);
        return { staff, privilege };
      }),
    );
    return { rows, total };
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
          <IconUsers />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{session.company} staff</h1>
          <p className="text-sm text-slate-500">{total} currently on shift list</p>
        </div>
      </div>
      <FlashBanner notice={params.notice} error={params.error} />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4">Staff</th>
              <th className="p-4">Face</th>
              <th className="p-4">Gender</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-500">
                  No staff found.
                </td>
              </tr>
            ) : (
              rows.map(({ staff }) =>
                staff ? (
                  <tr key={staff.user_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                        <Link href={`/staff/${staff.friendly || staff.user_id}`} className="inline-flex items-center gap-2 font-medium text-[#ff8002] hover:underline">
                          <IconUser size={16} />
                          {staff.first} {staff.last}
                        </Link>
                    </td>
                    <td className="p-4">
                      {staff.face_vector ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          <IconCheck size={12} /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                          <IconXCircle size={12} /> Not registered
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{staff.gender || "—"}</td>
                  </tr>
                ) : null,
              )
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {page > 1 ? (
          <Link href={`/staff?page=${page - 1}`} className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
            Prev
          </Link>
        ) : null}
        <span className="px-3 py-1.5 text-sm text-slate-600">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={`/staff?page=${page + 1}`} className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
