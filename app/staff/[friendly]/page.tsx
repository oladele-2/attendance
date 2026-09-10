import { FaceCapture } from "@/components/FaceCapture";
import { requireAdmin } from "@/lib/guards";
import { withDb } from "@/lib/db";
import { getFacilityStaffProfile } from "@/lib/queries";
import { notFound } from "next/navigation";
import { IconScanFace, IconUser } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";
import Link from "next/link";

export default async function RegisterFacePage({
  params,
  searchParams,
}: {
  params: Promise<{ friendly: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const { friendly } = await params;
  const query = await searchParams;
  const staff = await withDb((db) => getFacilityStaffProfile(db, friendly, session.company_id));
  if (!staff) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-8">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
          <IconUser size={28} />
        </span>
        <h2 className="text-2xl font-bold text-slate-800">
          {staff.first} {staff.last}
        </h2>
        <FlashBanner notice={query.notice} error={query.error} className="mx-auto mt-4 max-w-lg" />
        <p className="mt-2 mb-6 flex items-center justify-center gap-2 text-slate-600">
          <IconScanFace size={16} />
          {Number(staff.has_face) > 0
            ? "A face template is already saved. You can update it."
            : "No face template yet. Register one so this staff member can use face check-in."}
        </p>
        <FaceCapture
          mode="register"
          endpoint="/api/save-face"
          extraBody={{ user_id: staff.user_id }}
          buttonLabel={Number(staff.has_face) > 0 ? "Update face template" : "Save face template"}
        />
        <Link prefetch={false} href="/staff" className="mt-6 inline-block text-sm font-semibold text-[#ff8002] hover:underline">
          Back to staff list
        </Link>
      </div>
    </main>
  );
}
