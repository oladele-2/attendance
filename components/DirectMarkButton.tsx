"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconClock, IconLogIn, IconLogOut } from "./icons";

type Props = {
  label: string;
  personName?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type Confirmation = {
  title: string;
  timestamp: string;
  facility: string;
  duration: string | null;
  reference: string;
};

export function DirectMarkButton({ label, personName, disabled = false, disabledReason }: Props) {
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [undoLeft, setUndoLeft] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const isOut = label.toLowerCase().includes("out");
  const isDone = disabled && /done|unavailable/i.test(label);

  useEffect(() => {
    if (undoLeft <= 0) return;
    const timer = window.setInterval(() => {
      setUndoLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [undoLeft > 0]);

  useEffect(() => {
    if (ok && attendanceId && undoLeft === 0) {
      window.location.href = "/verification";
    }
  }, [ok, attendanceId, undoLeft]);

  async function mark() {
    const who = personName ? ` for ${personName}` : "";
    const okConfirm = window.confirm(
      isOut ? `Check out now${who}?` : `Check in now${who}? This will be recorded immediately.`,
    );
    if (!okConfirm) return;

    setBusy(true);
    setOk(null);
    setStatus("Recording attendance...");
    try {
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        attendanceId?: number;
        undoSeconds?: number;
        confirmation?: Confirmation;
      };
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
        setAttendanceId(data.attendanceId ?? null);
        setUndoLeft(data.undoSeconds ?? 120);
        setConfirmation(data.confirmation ?? null);
        setBusy(false);
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

  async function undo() {
    if (!attendanceId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undo: true, attendanceId }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (data.success) {
        setOk(true);
        setStatus(data.message || "Undone");
        setUndoLeft(0);
        setAttendanceId(null);
        setConfirmation(null);
        window.setTimeout(() => {
          window.location.href = "/verification";
        }, 800);
      } else {
        setOk(false);
        setStatus(data.message || "Could not undo.");
        setBusy(false);
      }
    } catch {
      setOk(false);
      setStatus("Network error. Try again.");
      setBusy(false);
    }
  }

  const helper =
    disabledReason ??
    (disabled && /done/i.test(label)
      ? "You already completed this shift. A CEO can edit the record if needed."
      : null);

  return (
    <div className="mb-8 text-center">
      <button
        type="button"
        disabled={disabled || busy || undoLeft > 0}
        onClick={() => void mark()}
        className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-[#ff8002] px-8 py-3.5 text-lg font-bold text-white shadow-sm hover:bg-[#d98324] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isDone ? <IconCheck /> : isOut ? <IconLogOut /> : <IconLogIn />}
        {busy ? "Please wait..." : label}
      </button>
      {helper ? <p className="mt-3 text-sm text-slate-500">{helper}</p> : null}
      {confirmation && ok ? (
        <div role="status" className="mx-auto mt-5 max-w-md rounded-2xl border-2 border-green-300 bg-green-50 p-5 text-green-950 shadow-sm">
          <p className="text-2xl font-bold">{confirmation.title}</p>
          <dl className="mt-3 grid gap-1 text-sm">
            <div><dt className="inline font-semibold">Time: </dt><dd className="inline">{confirmation.timestamp}</dd></div>
            <div><dt className="inline font-semibold">Facility: </dt><dd className="inline">{confirmation.facility}</dd></div>
            {confirmation.duration ? <div><dt className="inline font-semibold">Shift duration: </dt><dd className="inline">{confirmation.duration}</dd></div> : null}
            <div><dt className="inline font-semibold">Reference: </dt><dd className="inline font-mono">{confirmation.reference}</dd></div>
          </dl>
        </div>
      ) : status ? (
        <p
          className={`mt-3 flex items-center justify-center gap-1 text-sm ${
            ok === false ? "text-[#a40606]" : ok === true ? "text-green-700" : "text-slate-600"
          }`}
        >
          <IconClock size={14} />
          {status}
        </p>
      ) : null}
      {ok && undoLeft > 0 && attendanceId ? (
        <p className="mt-3">
          <button type="button" onClick={() => void undo()} className="text-sm font-semibold text-[#a40606] underline">
            Undo ({undoLeft}s)
          </button>
        </p>
      ) : null}
    </div>
  );
}
