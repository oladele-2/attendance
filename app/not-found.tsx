import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">That page or record is missing, or you do not have access to it.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-[#ff8002] px-4 py-2.5 font-semibold text-white hover:bg-[#d98324]">
          Go home
        </Link>
      </div>
    </main>
  );
}
