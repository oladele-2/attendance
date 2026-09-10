import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AjirMed Attendance",
  description: "Staff attendance with QR login and face verification",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  applicationName: "AjirMed Attendance",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Attendance",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#a40606",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f4f4] text-slate-800 antialiased">
        <PwaRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
