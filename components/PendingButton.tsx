"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;

    // The submit event only fires after native form validation succeeds. Defer
    // disabling the button so it cannot cancel the browser's native form post.
    const handleSubmit = () => {
      window.setTimeout(() => setPending(true), 0);
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={pending}
      className={className}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
