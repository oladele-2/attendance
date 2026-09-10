"use client";

import { useEffect, useRef } from "react";
import { clearStoredFacility, readStoredFacility } from "@/lib/facility-storage";

export function RestoreFacility({ skip = false }: { skip?: boolean }) {
  const started = useRef(false);

  useEffect(() => {
    if (skip) {
      clearStoredFacility();
      return;
    }
    if (started.current) return;
    started.current = true;
    const stored = readStoredFacility();
    if (!stored) return;

    const body = new URLSearchParams();
    body.set("facility_id", String(stored.id));
    void fetch("/api/session/facility", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      credentials: "same-origin",
      redirect: "manual",
    }).then((res) => {
      const location = res.headers.get("Location") || "";
      if (location.includes("passcode")) {
        clearStoredFacility();
        window.location.replace(location);
        return;
      }
      window.location.replace("/scan");
    });
  }, [skip]);

  return null;
}
