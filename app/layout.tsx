import type { Metadata } from "next";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AjirMed Attendance",
  description: "Staff attendance with QR login and face verification",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f4f4] text-slate-800 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
