import { QrScanner } from "@/components/QrScanner";
import { requireFacility } from "@/lib/guards";
import { redirect } from "next/navigation";
import { IconLogIn, IconQr } from "@/components/icons";

export default async function ScanPage() {
  const session = await requireFacility();
  if (session.user_id) redirect("/verification");

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002]">
            <IconQr size={28} />
          </span>
          <h1 className="text-2xl font-bold text-slate-800">{session.company}</h1>
          <p className="mt-1 text-sm text-slate-500">Scan your staff QR code to sign in</p>
        </div>
        <QrScanner />
        <a
          href="/signin"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          <IconLogIn size={16} />
          Use email or phone instead
        </a>
        <a href="/forget-facility" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">
          Not this hospital?
        </a>
      </div>
    </main>
  );
}
