"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function PendingButton({
  children,
  className,
  pendingLabel = "Please wait...",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      aria-busy={pending}
      onClick={() => {
        // Native form posts don't update React form status; mark pending on click.
        setPending(true);
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
