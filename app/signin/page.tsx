import Link from "next/link";
import { PasswordToggle } from "@/components/PasswordToggle";
import { requireFacility } from "@/lib/guards";
import { redirect } from "next/navigation";
import { IconLogIn, IconMail, IconQr } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";
import { PendingButton } from "@/components/PendingButton";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireFacility();
  if (session.user_id) redirect("/verification");
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconLogIn size={28} />
          </span>
          <h1 className="text-2xl font-bold text-slate-800">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">{session.company}</p>
        </div>
        {params.error ? <FlashBanner error={params.error} /> : null}
        <form action="/api/session/password" method="post" className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">
              Email or phone
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                <IconMail size={18} />
              </span>
              <input
                id="identifier"
                name="member_email"
                required
                placeholder="name@hospital.com or 080..."
                className="w-full rounded-xl border border-slate-300 py-3 pr-3 pl-10 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <PasswordToggle />
          </div>
          <PendingButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff8002] py-3.5 font-bold text-white hover:bg-[#d98324] disabled:bg-gray-400">
            <IconLogIn size={18} />
            Login
          </PendingButton>
        </form>
        <Link
          href="/scan"
          className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#ff8002] hover:underline"
        >
          <IconQr size={16} />
          Prefer QR login?
        </Link>
        <a href="/forget-facility" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">
          Not this hospital?
        </a>
      </div>
    </main>
  );
}
