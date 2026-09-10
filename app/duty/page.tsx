import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { listOpenShifts } from "@/lib/queries";
import { actionDate, minutesToHm } from "@/lib/dates";
import { closeForgottenShift } from "@/app/actions";
import { FlashBanner } from "@/components/FlashBanner";
import { StaffAvatar } from "@/components/StaffPhoto";
import { IconClock, IconUsers } from "@/components/icons";

export default async function DutyPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; notice?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const hours = [8, 12, 16, 24].includes(Number(params.hours)) ? Number(params.hours) : 12;
  const open = await withDb((db) => listOpenShifts(db, session.company_id));
  const forgotten = open.filter((row) => Number(row.minutes_open) >= hours * 60);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
          <IconUsers />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">On duty</h1>
          <p className="text-sm text-slate-500">Open check-ins at {session.company} · Africa/Lagos</p>
        </div>
      </div>
      <FlashBanner notice={params.notice} error={params.error} />

      <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Checked in now ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nobody has an open shift right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {open.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <StaffAvatar img={row.img} name={`${row.first ?? ""} ${row.last ?? ""}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {row.first} {row.last}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.privilege || "Staff"} · in {actionDate(row.check_in_time)} · {minutesToHm(Number(row.minutes_open))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <IconClock size={16} /> Forgotten check-out ({forgotten.length})
          </h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <label htmlFor="hours">Older than</label>
            <select
              id="hours"
              name="hours"
              defaultValue={String(hours)}
              className="rounded-lg border border-slate-300 px-2 py-1"
            >
              <option value="8">8 hours</option>
              <option value="12">12 hours</option>
              <option value="16">16 hours</option>
              <option value="24">24 hours</option>
            </select>
            <button type="submit" className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">
              Apply
            </button>
          </form>
        </div>
        {forgotten.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No open shifts older than {hours} hours.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {forgotten.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <StaffAvatar img={row.img} name={`${row.first ?? ""} ${row.last ?? ""}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {row.first} {row.last}
                  </p>
                  <p className="text-xs text-slate-500">
                    Open since {actionDate(row.check_in_time)} ({minutesToHm(Number(row.minutes_open))})
                  </p>
                </div>
                <form action={closeForgottenShift}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="hours" value={hours} />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#fff4ea] px-3 py-1.5 text-xs font-semibold text-[#d98324] hover:bg-[#ff8002] hover:text-white"
                  >
                    Check out now
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
