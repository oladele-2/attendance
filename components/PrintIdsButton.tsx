"use client";

export function PrintIdsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-[#a40606] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6e0404] print:hidden"
    >
      Print ID cards
    </button>
  );
}
