import { submitPasscode } from "@/app/actions";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { IconBuilding, IconLock } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";
import { PendingButton } from "@/components/PendingButton";

export default async function PasscodePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session?.company_id) redirect(session.user_id ? "/" : "/scan");
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full rounded-2xl bg-white px-8 py-10 text-center shadow-lg ring-1 ring-slate-200">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
          <IconBuilding size={28} />
        </span>
        <h2 className="mb-2 text-2xl font-bold text-[#ff8002]">Facility Passcode</h2>
        <p className="mb-6 text-sm text-slate-500">Enter your hospital attendance passcode to continue.</p>
        {params.error ? <FlashBanner error={params.error} /> : null}
        <form action={submitPasscode} className="flex flex-col gap-4" autoComplete="off">
          <label className="sr-only" htmlFor="facility_id">
            Passcode
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              <IconLock size={18} />
            </span>
            <input
              id="facility_id"
              type="password"
              name="facility_id"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="Passcode"
              className="w-full rounded-xl border border-slate-300 py-3 pr-3 pl-10 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
            />
          </div>
          <PendingButton className="rounded-xl bg-gradient-to-r from-[#a40606] to-[#d98324] py-3 font-semibold text-white shadow hover:opacity-95 disabled:opacity-60">
            Enter
          </PendingButton>
        </form>
      </div>
    </main>
  );
}
