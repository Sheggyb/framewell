"use client";

import { History, Keyboard, Undo2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";
import { SHORTCUTS } from "./shortcuts";

/** Bottom sheet on phones, centred dialog on larger screens. Escape or a tap outside closes. */
export function Sheet({ title, icon, onClose, children }: { title: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl bg-[#111114] shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <span className="text-gold [&_svg]:size-4">{icon}</span>
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-300"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/** Every change you made, newest first. Tap one to go back (or forward) to right after it. */
export function HistorySheet() {
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const { jumpHistory, openDialog } = useEditor.getState();
  const close = () => openDialog(null);

  // Redo-able steps first (dimmed), then the current state, then older steps.
  const rows = [
    ...future.map((e, i) => ({ label: e.label, steps: past.length + i + 1, kind: "future" as const })).reverse(),
    ...past.map((e, i) => ({ label: e.label, steps: i + 1, kind: "past" as const })).reverse(),
  ];

  return (
    <Sheet title="History" icon={<History />} onClose={close}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">No changes yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((row) => {
            const current = row.kind === "past" && row.steps === past.length;
            return (
              <li key={`${row.kind}-${row.steps}`}>
                <button
                  type="button"
                  onClick={() => jumpHistory(row.steps)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]",
                    current && "bg-gold/10 text-gold",
                    row.kind === "future" && "text-neutral-500",
                  )}
                >
                  <span className="w-6 text-right font-mono text-xs text-neutral-500">{row.steps}</span>
                  <span className="flex-1 truncate">{row.label}</span>
                  {current && <span className="text-[10px] font-semibold uppercase tracking-wider">Now</span>}
                  {row.kind === "future" && <span className="text-[10px] uppercase tracking-wider">Undone</span>}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => jumpHistory(0)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06]",
                past.length === 0 && "bg-gold/10 text-gold",
              )}
            >
              <Undo2 className="size-4" /> Start (no changes)
            </button>
          </li>
        </ol>
      )}
    </Sheet>
  );
}

export function ShortcutsSheet() {
  const close = () => useEditor.getState().openDialog(null);
  return (
    <Sheet title="Keyboard shortcuts" icon={<Keyboard />} onClose={close}>
      <div className="flex flex-col gap-5">
        {SHORTCUTS.map(([group, rows]) => (
          <section key={group}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">{group}</h3>
            <dl className="flex flex-col gap-1.5">
              {rows.map(([keys, action]) => (
                <div key={keys} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-neutral-300">{action}</dt>
                  <dd className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-neutral-200">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** Brief confirmation above the toolbar, with Undo where it makes sense. */
export function ToastHost() {
  const toast = useEditor((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useEditor.getState().hideToast(), toast.undo ? 4500 : 2000);
    return () => clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-40 flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#1a1a1f]/95 py-2 pr-2 pl-4 text-sm text-neutral-100 shadow-2xl backdrop-blur animate-[fw-rise_0.25s_ease-out]"
      >
        {toast.message}
        {toast.undo ? (
          <button
            type="button"
            onClick={() => {
              useEditor.getState().undo();
              useEditor.getState().hideToast();
            }}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold hover:bg-white/15"
          >
            Undo
          </button>
        ) : (
          <span className="pr-2" />
        )}
      </div>
    </div>
  );
}
