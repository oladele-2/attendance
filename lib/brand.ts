export const BRAND = {
  primary: "#a40606",
  primaryDeep: "#6e0404",
  gold: "#c4a035",
  orange: "#ff8002",
  ink: "#1c1917",
  tagline: "Excellence in specialized care.",
  assetHost: "https://attendance.ajirmed.com",
  values: [
    { title: "Integrity", text: "We do what is right." },
    { title: "Compassion", text: "We care with kindness." },
    { title: "Excellence", text: "We strive for the highest standards." },
  ],
} as const;

export function splitOrgName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return { lead: words[0] ?? name, rest: words.slice(1).join(" ") };
}

export function splitPersonName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: name, last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function logoSrc(logo?: string | null) {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo)) return logo;
  return `${BRAND.assetHost}/img/logo/${logo}`;
}

export function photoSrc(img?: string | null) {
  if (!img) return null;
  const generic = ["staff.png", "patient.png", "default.png"];
  if (generic.includes(img.toLowerCase())) return null;
  if (/^https?:\/\//i.test(img)) return img;
  return `${BRAND.assetHost}/img/${img}`;
}

export function formatAddress(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

export function websiteHost(url?: string | null) {
  if (!url) return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}
