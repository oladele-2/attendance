"use client";

type Option = { user_id: number; first: string | null; last: string | null };

export function StaffPicker({
  options,
  value,
  readOnlyName,
}: {
  options: Option[];
  value?: number;
  readOnlyName?: string;
}) {
  if (readOnlyName) {
    return (
      <input
        readOnly
        value={readOnlyName}
        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-700"
      />
    );
  }

  return (
    <select
      name="staff"
      defaultValue={value ? String(value) : ""}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
      aria-label="Staff member"
    >
      <option value="">All staff</option>
      {options.map((person) => (
        <option key={person.user_id} value={person.user_id}>
          {`${person.first ?? ""} ${person.last ?? ""}`.trim() || `Staff ${person.user_id}`}
        </option>
      ))}
    </select>
  );
}
