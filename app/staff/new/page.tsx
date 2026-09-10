import Link from "next/link";
import { createStaff } from "@/app/actions";
import { requireAdmin } from "@/lib/guards";
import { FlashBanner } from "@/components/FlashBanner";
import { PasswordToggle } from "@/components/PasswordToggle";
import { PendingButton } from "@/components/PendingButton";
import { IconMail, IconPhone, IconSave, IconUserPlus } from "@/components/icons";
import { StaffPhotoField } from "@/components/StaffPhoto";

const ROLES = ["Staff", "Nurse", "Doctor", "Lab Scientist", "Security", "Reception", "Admin"];

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const roles = session.privilege === "CEO" ? [...ROLES, "CEO"] : ROLES;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconUserPlus size={28} />
          </span>
          <h1 className="text-2xl font-bold text-slate-800">Add staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a login for {session.company}. They can sign in with email or phone, then check in.
          </p>
        </div>
        <FlashBanner error={params.error} />
        <form action={createStaff} className="space-y-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first" className="mb-1 block text-sm font-semibold text-slate-700">
                First name
              </label>
              <input
                id="first"
                name="first"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              />
            </div>
            <div>
              <label htmlFor="last" className="mb-1 block text-sm font-semibold text-slate-700">
                Last name
              </label>
              <input
                id="last"
                name="last"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                <IconMail size={18} />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@hospital.com"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-10 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-slate-700">
              Phone
            </label>
            <div className="flex gap-2">
              <input
                name="pre"
                defaultValue="234"
                inputMode="numeric"
                aria-label="Country code"
                className="w-20 rounded-xl border border-slate-300 px-2 py-2.5 text-center outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              />
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                  <IconPhone size={18} />
                </span>
                <input
                  id="phone"
                  name="phone"
                  required
                  inputMode="tel"
                  placeholder="8012345678"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-10 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-semibold text-slate-700">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                required
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
            <div>
              <label htmlFor="privilege" className="mb-1 block text-sm font-semibold text-slate-700">
                Role
              </label>
              <select
                id="privilege"
                name="privilege"
                defaultValue="Staff"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="dob" className="mb-1 block text-sm font-semibold text-slate-700">
              Date of birth <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
            />
          </div>
          <div>
            <label htmlFor="note" className="mb-1 block text-sm font-semibold text-slate-700">
              Unit / note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="note"
              name="note"
              placeholder="Ward, department…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
            />
          </div>
          <StaffPhotoField />
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <PasswordToggle
              id="new-password"
              name="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required={false}
            />
            <p className="mt-1 text-xs text-slate-500">
              Skip only if this email already has an AjirMed account — we will add them to this facility.
            </p>
          </div>
          <div>
            <label htmlFor="password_confirm" className="mb-1 block text-sm font-semibold text-slate-700">
              Confirm password
            </label>
            <PasswordToggle
              id="password_confirm"
              name="password_confirm"
              placeholder="Repeat password"
              autoComplete="new-password"
              required={false}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <PendingButton className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff8002] px-4 py-3 font-semibold text-white hover:bg-[#d98324] disabled:cursor-not-allowed disabled:bg-gray-400">
              <IconSave size={16} /> Save staff
            </PendingButton>
            <Link prefetch={false} href="/staff" className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 hover:bg-slate-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
