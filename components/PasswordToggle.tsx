"use client";

import { useState } from "react";
import { IconEye, IconEyeOff, IconLock } from "./icons";

export function PasswordToggle({
  id = "password",
  name = "member_password",
  placeholder = "Enter your password",
  autoComplete = "current-password",
  required = true,
}: {
  id?: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
        <IconLock size={18} />
      </span>
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        autoCorrect="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        className="w-full rounded-xl border border-slate-300 py-3 pr-12 pl-10 outline-none focus:border-[#ff8002] focus:ring-2 focus:ring-[#ff8002]/20"
      />
      <button
        type="button"
        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-[#ff8002]"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
