"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "attendance_install_hint_dismissed";

export function PwaInstallHint({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (!show || typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const standalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(apple);
    setVisible(true);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="mb-5 rounded-xl border border-[#ffcc80] bg-[#fff8e6] px-4 py-3 text-left text-sm text-[#b36b00]">
      <p className="font-semibold text-slate-800">Add to Home Screen</p>
      <p className="mt-1 text-slate-600">
        {ios
          ? "On iPhone: tap Share, then Add to Home Screen, so Mark Attendance is one tap away."
          : "Install this app on your phone for faster check-in. Look for Install or Add to Home Screen in the browser menu."}
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-[#d98324] underline"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
      >
        Don’t show again
      </button>
    </div>
  );
}
