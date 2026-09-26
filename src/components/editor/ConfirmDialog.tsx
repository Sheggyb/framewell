"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor";

/** Bottom sheet asking before destructive actions. Enter confirms, Escape or a tap outside cancels. */
export function ConfirmDialog() {
  const request = useEditor((s) => s.confirm);
  const confirmButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        useEditor.getState().closeConfirm();
      }
    };
    // Capture so the editor's own shortcuts (Escape deselects, Delete deletes) don't also fire.
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [request]);

  if (!request) return null;

  const confirm = () => {
    useEditor.getState().closeConfirm();
    request.onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) useEditor.getState().closeConfirm();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-t-2xl bg-neutral-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-title" className="text-base font-semibold text-white">
              {request.title}
            </h2>
            {request.message && <p className="mt-1 text-sm text-neutral-400">{request.message}</p>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => useEditor.getState().closeConfirm()}
            className="h-12 rounded-xl bg-white/10 text-sm font-semibold text-neutral-100 hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            ref={confirmButton}
            type="button"
            onClick={confirm}
            className="h-12 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-400"
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
