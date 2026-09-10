"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconChart,
  IconClose,
  IconHome,
  IconLogIn,
  IconLogOut,
  IconMenu,
  IconQr,
  IconScanFace,
  IconUsers,
} from "./icons";

type Props = {
  company: string;
  personName?: string;
  personHref?: string;
  privilege?: string;
  loggedIn: boolean;
};

export function Nav({ company, personName, personHref, privilege, loggedIn }: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const admin = privilege === "CEO" || privilege === "Admin";

  const items = [
    { href: "/", label: "Home", icon: IconHome, show: loggedIn },
    { href: "/scan", label: "QR login", icon: IconQr, show: !loggedIn },
    { href: "/signin", label: "Sign in", icon: IconLogIn, show: !loggedIn },
    { href: "/dashboard", label: "Performance", icon: IconChart, show: loggedIn },
    { href: "/staff", label: "Staff", icon: IconUsers, show: admin },
    { href: "/verification", label: "Mark", icon: IconScanFace, show: loggedIn },
    { href: "/qrcodes", label: "Codes", icon: IconQr, show: admin },
    { href: "/logout", label: "Logout", icon: IconLogOut, show: loggedIn },
  ].filter((item) => item.show);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const linkClass = (href: string) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive(href)
        ? "bg-white text-[#a40606] hover:bg-white hover:text-[#a40606]"
        : "bg-transparent text-white hover:bg-white/15 hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#a40606] via-[#d98324] to-[#ff8002] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <a href="/" className="block truncate text-lg font-bold tracking-tight">
            {company || "AjirMed"}
          </a>
          {personName ? (
            personHref ? (
              <a href={personHref} className="truncate text-xs text-white/90 hover:underline">
                {personName}
              </a>
            ) : (
              <span className="truncate text-xs text-white/90">{personName}</span>
            )
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-white/15 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
        <ul
          className={`${
            open ? "flex" : "hidden"
          } absolute right-4 top-16 z-50 w-52 flex-col gap-1 rounded-xl bg-[#a40606] p-3 shadow-xl md:static md:flex md:w-auto md:flex-row md:items-center md:gap-1 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {items.map((item) => (
            <li key={item.href}>
              <a
                className={linkClass(item.href)}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                style={isActive(item.href) ? { color: "#a40606", backgroundColor: "#ffffff" } : undefined}
                onClick={() => setOpen(false)}
              >
                <item.icon size={16} />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
