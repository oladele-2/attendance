import { photoSrc } from "@/lib/brand";

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
