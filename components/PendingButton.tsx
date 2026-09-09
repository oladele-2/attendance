"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className,
  pendingLabel = "Please wait...",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
