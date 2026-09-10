import { requireUser } from "@/lib/guards";
import { isAdminRole } from "@/lib/roles";
import { IconChart, IconClock, IconQr, IconScanFace, IconUsers } from "@/components/icons";
import { FlashBanner } from "@/components/FlashBanner";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const admin = isAdminRole(session.privilege);

  const cards = [
    {
      href: "/dashboard",
      title: "Performance",
      body: "View attendance reports",
      icon: IconChart,
    },
    ...(admin
      ? [
          {
            href: "/onduty",
            title: "On duty",
            body: "See who is currently checked in",
            icon: IconClock,
          },
          {
            href: "/staff",
            title: "Staff",
            body: "Add staff and register faces",
            icon: IconUsers,
          },
        ]
      : []),
    {
      href: "/hours",
      title: "My hours",
      body: "This month’s shifts and export",
      icon: IconClock,
    },
    {
      href: "/verification",
      title: "Mark Attendance",
      body: "Check in or out, with or without face",
      icon: IconScanFace,
    },
    ...(admin
      ? [
          {
            href: "/qrcodes",
            title: "QR Codes",
            body: "Print staff login codes",
            icon: IconQr,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#d98324]">AjirMed Attendance</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-800">Welcome{session.first ? `, ${session.first}` : ""}</h1>
        <p className="mt-2 text-slate-600">Choose what you want to do.</p>
      </div>
      <FlashBanner notice={params.notice} error={params.error} className="mx-auto mb-6 max-w-xl" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            prefetch={false}
            className="group rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg hover:ring-[#ff8002]/40"
          >
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ea] text-[#ff8002] group-hover:bg-[#ff8002] group-hover:text-white">
              <card.icon size={28} />
            </span>
            <h2 className="mb-1 text-lg font-semibold text-slate-800">{card.title}</h2>
            <p className="text-sm text-slate-500">{card.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
