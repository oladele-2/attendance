import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AjirMed Attendance",
  description: "Staff attendance with QR login and face verification",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f4f4] text-slate-800 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
