"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const detail = error?.message?.trim();
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">We could not complete that request. Try again in a moment.</p>
        {detail ? (
          <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            {detail}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[#ff8002] px-4 py-2.5 font-semibold text-white hover:bg-[#d98324]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
