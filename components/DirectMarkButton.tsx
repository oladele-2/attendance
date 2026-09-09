"use client";

import { useState } from "react";
import { IconCheck, IconClock, IconLogIn, IconLogOut } from "./icons";

type Props = {
  label: string;
  disabled?: boolean;
};

export function DirectMarkButton({ label, disabled = false }: Props) {
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const isOut = label.toLowerCase().includes("out");
  const isDone = disabled;

  async function mark() {
    setBusy(true);
    setOk(null);
    setStatus("Recording attendance...");
    try {
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.status === 401) {
        setOk(false);
        setStatus(data.message || "Your session expired. Please sign in again.");
        setTimeout(() => {
          window.location.href = "/scan";
        }, 1200);
        return;
      }
      if (res.status === 403) {
        setOk(false);
        setStatus(data.message || "You do not have permission to do that.");
        setBusy(false);
        return;
      }
      if (data.success) {
        setOk(true);
        setStatus(data.message || "Done");
        setTimeout(() => window.location.reload(), 700);
      } else {
        setOk(false);
        setStatus(data.message || "Attendance could not be recorded.");
        setBusy(false);
      }
    } catch {
      setOk(false);
      setStatus("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 text-center">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={mark}
        className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-[#ff8002] px-8 py-3.5 text-lg font-bold text-white shadow-sm hover:bg-[#d98324] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isDone ? <IconCheck /> : isOut ? <IconLogOut /> : <IconLogIn />}
        {busy ? "Please wait..." : label}
      </button>
      {disabled ? (
        <p className="mt-3 text-sm text-slate-500">You already completed this shift. A CEO can edit the record if needed.</p>
      ) : null}
      {status ? (
        <p
          className={`mt-3 flex items-center justify-center gap-1 text-sm ${
            ok === false ? "text-[#a40606]" : ok === true ? "text-green-700" : "text-slate-600"
          }`}
        >
          <IconClock size={14} />
          {status}
        </p>
      ) : null}
    </div>
  );
}
