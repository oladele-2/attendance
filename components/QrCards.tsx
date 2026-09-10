"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  BRAND,
  initialsOf,
  logoSrc,
  photoSrc,
  splitOrgName,
  splitPersonName,
  websiteHost,
} from "@/lib/brand";

export type IdCardData = {
  user_id: number;
  name: string;
  role: string;
  gender?: string | null;
  phone?: string | null;
  staffId?: string | null;
  photo?: string | null;
};

export type FacilityBrand = {
  name: string;
  logo?: string | null;
  website?: string | null;
  address?: string | null;
  tagline?: string | null;
};

function CaduceusMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="currentColor" opacity="0.12" />
      <path
        d="M32 10v36M26 18c-8 4-8 14 0 16 8-2 8-12 0-16zm12 0c8 4 8 14 0 16-8-2-8-12 0-16zM24 46h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function Heartbeat() {
  return (
    <svg viewBox="0 0 120 24" className="h-5 w-28 text-[var(--id-gold)]" aria-hidden="true">
      <path
        d="M0 14h18l6-8 8 16 8-20 8 14h52"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ValueIcon({ kind }: { kind: "integrity" | "compassion" | "excellence" }) {
  const paths = {
    integrity: "M12 3 5 7v6c0 5 3.2 8.5 7 9.5 3.8-1 7-4.5 7-9.5V7l-7-4zM9 12l2 2 4-4",
    compassion: "M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z",
    excellence: "M12 3l2.2 6.5H21l-5.4 4 2.1 6.5L12 16.5 6.3 20l2.1-6.5L3 9.5h6.8z",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--id-gold)]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={paths[kind]} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PolicyIcon({ kind }: { kind: "person" | "lock" | "id" }) {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--id-primary)] text-white">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        {kind === "person" ? (
          <>
            <circle cx="12" cy="8" r="3" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </>
        ) : kind === "lock" ? (
          <>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        ) : (
          <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="12" r="2" />
            <path d="M13 11h5M13 15h4" />
          </>
        )}
      </svg>
    </span>
  );
}

function CardShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase print:hidden">{label}</p>
      <article
        className="relative h-[31.5rem] w-[20.5rem] overflow-hidden rounded-[1.7rem] bg-white shadow-[0_18px_40px_rgba(80,20,10,0.18)] ring-1 ring-black/10"
        style={
          {
            "--id-primary": BRAND.primary,
            "--id-primary-deep": BRAND.primaryDeep,
            "--id-gold": BRAND.gold,
            "--id-ink": BRAND.ink,
          } as CSSProperties
        }
      >
        <CaduceusMark className="pointer-events-none absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
        {children}
      </article>
    </div>
  );
}

function LogoBadge({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(!src);
  return (
    <div className="flex h-[4.4rem] w-[4.4rem] items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[var(--id-gold)] shadow-md">
      {!failed && src ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-[var(--id-primary)]">
          <CaduceusMark className="h-10 w-10" />
        </span>
      )}
      <span className="sr-only">{name} logo</span>
    </div>
  );
}

function Portrait({ name, photo }: { name: string; photo: string | null }) {
  const [failed, setFailed] = useState(!photo);
  return (
    <div className="h-[8.6rem] w-[6.4rem] overflow-hidden rounded-sm border-[3px] border-[var(--id-primary)] bg-slate-100 shadow-sm">
      {!failed && photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#fff4ea] to-[#f3d5b5] text-2xl font-bold text-[var(--id-primary)]">
          {initialsOf(name)}
        </div>
      )}
    </div>
  );
}

function IdFront({ card, facility }: { card: IdCardData; facility: FacilityBrand }) {
  const org = splitOrgName(facility.name);
  const person = splitPersonName(card.name);
  const logo = logoSrc(facility.logo);
  const photo = photoSrc(card.photo) ?? `${BRAND.photoHost}/patient.png`;
  const tagline = facility.tagline?.trim() || BRAND.tagline;

  return (
    <CardShell label="Front">
      <div className="relative z-10 flex h-full flex-col">
        <div className="relative h-[8.4rem] bg-[var(--id-primary)]">
          <div className="id-hex absolute inset-0 opacity-25" />
          <div className="relative flex items-start gap-3 px-4 pt-4">
            <LogoBadge src={logo} name={facility.name} />
            <div className="min-w-0 pt-1 text-white">
              <p className="text-[1.35rem] leading-none font-extrabold tracking-tight uppercase">{org.lead}</p>
              {org.rest ? <p className="mt-1 text-[0.72rem] font-semibold tracking-wide uppercase">{org.rest}</p> : null}
              <p className="mt-1 truncate text-[10px] text-white/80 italic">{tagline}</p>
            </div>
          </div>
          <div className="absolute right-3 bottom-8">
            <Heartbeat />
          </div>
          <svg className="absolute -bottom-px left-0 w-full" viewBox="0 0 328 36" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 8 Q164 36 328 8 V36 H0 Z" fill="white" />
            <path d="M0 8 Q164 36 328 8" fill="none" stroke="var(--id-gold)" strokeWidth="2.4" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-1 items-start gap-4 px-5 pt-2">
          <Portrait name={card.name} photo={photo} />
          <div className="min-w-0 pt-2">
            <p className="text-[1.45rem] leading-none font-black tracking-tight text-[var(--id-ink)] uppercase">{person.first}</p>
            {person.last ? (
              <p className="mt-1 text-[1.15rem] leading-tight font-extrabold tracking-wide text-[var(--id-primary)] uppercase">
                {person.last}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] text-slate-700 uppercase">{card.role}</p>
            {card.staffId ? <p className="mt-2 text-[10px] text-slate-500">ID {card.staffId}</p> : null}
          </div>
        </div>

        <div className="relative mt-auto">
          <svg className="relative z-10 w-full" viewBox="0 0 328 28" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 28 V18 Q164 0 328 18 V28 Z" fill="var(--id-primary)" />
            <path d="M0 18 Q164 0 328 18" fill="none" stroke="var(--id-gold)" strokeWidth="2.4" />
          </svg>
          <div className="relative z-10 grid grid-cols-3 gap-1 bg-[var(--id-primary)] px-3 pt-1 pb-4 text-center text-white">
            {BRAND.values.map((value) => (
              <div key={value.title} className="flex flex-col items-center">
                <ValueIcon
                  kind={value.title.toLowerCase() as "integrity" | "compassion" | "excellence"}
                />
                <p className="mt-1 text-[9px] font-bold tracking-wide uppercase">{value.title}</p>
                <p className="text-[8px] leading-tight text-white/80">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function IdBack({
  card,
  facility,
  qr,
}: {
  card: IdCardData;
  facility: FacilityBrand;
  qr?: string;
}) {
  const org = splitOrgName(facility.name);
  const logo = logoSrc(facility.logo);
  const web = websiteHost(facility.website);
  const policies = [
    { kind: "person" as const, text: `This card identifies the bearer as an authorized staff of ${facility.name}.` },
    { kind: "lock" as const, text: "This card is non-transferable and remains the property of the hospital." },
    { kind: "id" as const, text: "If lost or found, please return to the Human Resources Department." },
  ];

  return (
    <CardShell label="Back">
      <div className="relative z-10 flex h-full flex-col">
        <div className="relative h-[7.6rem] bg-[var(--id-primary)]">
          <div className="id-hex absolute inset-0 opacity-25" />
          <div className="relative flex flex-col items-center pt-4">
            <LogoBadge src={logo} name={facility.name} />
            <p className="mt-2 text-sm font-extrabold tracking-wide text-white uppercase">
              {org.lead} {org.rest}
            </p>
          </div>
          <svg className="absolute -bottom-px left-0 w-full" viewBox="0 0 328 32" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 10 Q164 32 328 10 V32 H0 Z" fill="white" />
            <path d="M0 10 Q164 32 328 10" fill="none" stroke="var(--id-gold)" strokeWidth="2.4" />
          </svg>
        </div>

        <div className="space-y-2.5 px-5 pt-1">
          {policies.map((policy) => (
            <p key={policy.kind} className="flex items-start gap-2 text-[11px] leading-snug text-slate-700">
              <PolicyIcon kind={policy.kind} />
              <span>{policy.text}</span>
            </p>
          ))}
        </div>

        <div className="mx-auto mt-3 flex h-[9.4rem] w-[9.4rem] items-center justify-center border border-slate-800 bg-white p-1">
          {qr ? (
            <img src={qr} alt={`Attendance QR for ${card.name}`} className="h-full w-full object-contain" />
          ) : (
            <div className="h-full w-full animate-pulse bg-slate-100" />
          )}
        </div>

        <div className="relative mt-auto">
          <svg className="w-full" viewBox="0 0 328 22" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 22 V12 Q164 0 328 12 V22 Z" fill="var(--id-primary)" />
            <path d="M0 12 Q164 0 328 12" fill="none" stroke="var(--id-gold)" strokeWidth="2.4" />
          </svg>
          <div className="space-y-1 bg-[var(--id-primary)] px-4 pt-1 pb-4 text-center text-[10px] leading-snug text-white">
            {facility.address ? <p>{facility.address}</p> : null}
            {web ? <p>{web}</p> : <p>Powered by AjirMed</p>}
            {card.phone ? <p>{card.phone}</p> : null}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

export function QrCards({ cards, facility }: { cards: IdCardData[]; facility: FacilityBrand }) {
  const [images, setImages] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const next: Record<number, string> = {};
      for (const card of cards) {
        next[card.user_id] = await QRCode.toDataURL(JSON.stringify({ user_id: card.user_id }), {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 280,
          color: { dark: "#111111", light: "#ffffff" },
        });
      }
      if (!cancelled) setImages(next);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [cards]);

  if (cards.length === 0) {
    return <p className="text-center text-slate-500">No staff ID cards on this page.</p>;
  }

  return (
    <div className="space-y-12">
      {cards.map((card) => (
        <section key={card.user_id} className="break-inside-avoid">
          <h3 className="mb-4 text-center text-sm font-semibold text-slate-500 print:hidden">{card.name}</h3>
          <div className="flex flex-wrap justify-center gap-8">
            <IdFront card={card} facility={facility} />
            <IdBack card={card} facility={facility} qr={images[card.user_id]} />
          </div>
        </section>
      ))}
    </div>
  );
}
