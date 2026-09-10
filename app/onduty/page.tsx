import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { listOpenShifts } from "@/lib/queries";
import { formatLongDate, isoDate, isoDateValue, minutesToHm, mysqlLagosStamp } from "@/lib/dates";
import { FlashBanner } from "@/components/FlashBanner";
import { StaffAvatar } from "@/components/StaffAvatar";
import { IconClock, IconUsers } from "@/components/icons";

type OpenShift = Awaited<ReturnType<typeof listOpenShifts>>[number];

function ShiftGroup({
  title,
  rows,
  empty,
  tone = "normal",
}: {
  title: string;
  rows: OpenShift[];
  empty: string;
  tone?: "normal" | "warning" | "danger";
}) {
  const heading =
    tone === "danger" ? "bg-red-50 text-red-800" : tone === "warning" ? "bg-amber-50 text-amber-800" : "text-slate-700";
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <h2 className={`flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold ${heading}`}>
        <IconClock size={16} /> {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <StaffAvatar img={row.img} name={`${row.first ?? ""} ${row.last ?? ""}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{row.first} {row.last}</p>
                <p className="text-xs text-slate-500">
                  Open since {mysqlLagosStamp(row.check_in_time)} · {minutesToHm(Number(row.minutes_open))}
                </p>
              </div>
              {tone !== "normal" ? (
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  Must check out from their own account
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function OnDutyPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; notice?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const hours = [8, 12, 16, 24].includes(Number(params.hours)) ? Number(params.hours) : 12;
  const today = isoDate();
  const open = await withDb((db) => listOpenShifts(db, session.company_id));
  const longIds = new Set(open.filter((row) => Number(row.minutes_open) >= hours * 60).map((row) => row.id));
  const unusuallyLong = open.filter((row) => longIds.has(row.id));
  const overnight = open.filter((row) => !longIds.has(row.id) && isoDateValue(row.check_in_time) < today);
  const todayOpen = open.filter((row) => !longIds.has(row.id) && isoDateValue(row.check_in_time) >= today);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconUsers />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">On duty</h1>
            <p className="text-sm text-slate-500">{session.company} · {formatLongDate(today)} · Africa/Lagos</p>
          </div>
        </div>
        <form method="get" className="flex items-center gap-2 text-sm">
          <label htmlFor="hours">Longer than</label>
          <select id="hours" name="hours" defaultValue={String(hours)} className="rounded-lg border border-slate-300 px-2 py-1">
            <option value="8">8 hours</option>
            <option value="12">12 hours</option>
            <option value="16">16 hours</option>
            <option value="24">24 hours</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">Apply</button>
        </form>
      </div>
      <FlashBanner notice={params.notice} error={params.error} />
      <div className="grid gap-6">
        <ShiftGroup title="Checked in today" rows={todayOpen} empty="Nobody checked in today is currently on duty." />
        <ShiftGroup title="Overnight shifts" rows={overnight} empty="There are no open overnight shifts." tone="warning" />
        <ShiftGroup title={`Unusually long shifts (over ${hours}h)`} rows={unusuallyLong} empty={`There are no open shifts older than ${hours} hours.`} tone="danger" />
      </div>
    </main>
  );
}
