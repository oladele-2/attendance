"use client";

import { useEffect } from "react";
import { writeStoredFacility } from "@/lib/facility-storage";

export function RememberFacility({
  companyId,
  companyName,
}: {
  companyId?: number;
  companyName?: string;
}) {
  useEffect(() => {
    if (!companyId) return;
    writeStoredFacility(companyId, companyName || "");
  }, [companyId, companyName]);
  return null;
}
