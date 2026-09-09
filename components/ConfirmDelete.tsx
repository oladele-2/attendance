"use client";

import { useState } from "react";
import { deleteAttendanceAction } from "@/app/actions";
import { PendingButton } from "./PendingButton";
import { IconTrash } from "./icons";

export function ConfirmDelete({ id }: { id: number }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-600 hover:text-white"
      >
        <IconTrash size={12} /> Delete
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-xs font-medium text-red-700">Delete this record? This cannot be undone.</p>
      <div className="flex gap-1">
        <form action={deleteAttendanceAction}>
          <input type="hidden" name="id" value={id} />
          <PendingButton
            pendingLabel="Deleting..."
            className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:bg-red-300"
          >
            Yes, delete
          </PendingButton>
        </form>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
