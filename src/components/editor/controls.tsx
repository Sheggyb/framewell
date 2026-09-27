"use client";

/** Small form controls shared by the editor's bottom panels. */
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";

/**
 * Bottom sheet that takes the timeline's place while a tool is open. The check button closes it,
 * or runs `onDone` — the Templates panel uses that to add the template being browsed.
 */
export function PanelShell({ title, children, onDone }: { title: string; children: ReactNode; onDone?: () => void }) {
  return (
    <div className="flex h-72 shrink-0 flex-col rounded-t-2xl border-t border-white/10 bg-[#111114] shadow-[0_-12px_30px_rgba(0,0,0,0.45)] md:h-full md:rounded-none md:border-t-0 md:shadow-none">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">{title}</h2>
        <button
          type="button"
          aria-label="Done"
          title="Done"
          onClick={onDone ?? (() => useEditor.getState().openPanel(null))}
          className="flex size-8 items-center justify-center rounded-full bg-white text-neutral-950 shadow"
        >
          <Check className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{title}</h3>}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(Math.round(v)),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-xs text-neutral-300">
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 min-w-0 flex-1 accent-gold"
      />
      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-neutral-400">{format(value)}</span>
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  style,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={cn(
        "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs transition-colors [&_svg]:size-4",
        active
          ? "border-gold/70 bg-gold/10 text-white"
          : "border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-white/5 p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
            value === v ? "bg-white/15 text-white" : "text-neutral-400 hover:text-neutral-200",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
