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
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
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
