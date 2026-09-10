"use client";

import { useState } from "react";
import { photoSrc } from "@/lib/brand";

export function StaffPhotoField() {
  const [filename, setFilename] = useState("");
  const src = photoSrc(filename);

  return (
    <div>
      <label htmlFor="img" className="mb-1 block text-sm font-semibold text-slate-700">
        Photo filename <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <input
        id="img"
        name="img"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="21757-213-2026-08-13-15-59-47.jpeg"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
      />
      <p className="mt-1 text-xs text-slate-500">
        AjirMed photo name from{" "}
        <span className="font-medium">users.ajirmed.com</span>. Leave blank to use the default placeholder.
      </p>
      {src ? (
        <img src={src} alt="" className="mt-3 h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200" />
      ) : null}
    </div>
  );
}

export function StaffAvatar({ img, name }: { img?: string | null; name: string }) {
  const src = photoSrc(img);
  if (!src) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4ea] text-xs font-bold text-[#d98324]">
        {name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")}
      </span>
    );
  }
  return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />;
}
