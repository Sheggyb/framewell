"use client";

/** Small form controls shared by the editor's bottom panels. */
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";

/**
 * Where a panel is shown. Phones: a bottom sheet (the default). Desktop studio: a column beside
 * the preview ("embedded"), where the check button either closes that column (`onClose`) or is
 * left out (`onClose` unset, e.g. the always-open inspector).
 */
export const PanelHost = createContext<{ embedded: boolean; onClose?: () => void }>({ embedded: false });

/**
 * Bottom sheet that takes the timeline's place while a tool is open. The check button closes it,
 * or runs `onDone` — the Templates panel uses that to add the template being browsed.
 */
export function PanelShell({ title, children, onDone }: { title: string; children: ReactNode; onDone?: () => void }) {
  const t = useT();
  const host = useContext(PanelHost);
  const showDone = !host.embedded || Boolean(onDone ?? host.onClose);
  return (
    <div
      className={cn(
        "flex flex-col bg-[#111114]",
        host.embedded
          ? "min-h-0 flex-1"
          : "h-72 shrink-0 rounded-t-2xl border-t border-white/10 shadow-[0_-12px_30px_rgba(0,0,0,0.45)] md:h-full md:rounded-none md:border-t-0 md:shadow-none",
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">{title}</h2>
        {showDone && (
          <button
            type="button"
            aria-label={t("common.done")}
            title={t("common.done")}
            onClick={
              onDone ??
              host.onClose ??
              (() => {
                const s = useEditor.getState();
                // From a picker's "More" sheet, Done goes back to the picker, not out of it.
                if (s.moreOpen) s.setMoreOpen(false);
                else s.openPanel(null);
              })
            }
            className="flex size-8 items-center justify-center rounded-full bg-white text-neutral-950 shadow"
          >
            <Check className="size-4" />
          </button>
        )}
      </div>
      {/* @container: panels size their grids by their own width (bottom sheet, side column, inspector), not the screen's. */}
      <div className="@container min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
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
        dir="ltr"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 min-w-0 flex-1 accent-gold"
      />
      <span className="w-12 shrink-0 text-end font-mono tabular-nums text-neutral-400">{format(value)}</span>
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  style,
  disabled,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:size-4",
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

/**
 * A row that scrolls sideways: swipe on phones; on computers the mouse wheel scrolls it too, and
 * ‹ › buttons appear on hover while there is more to see.
 */
export function HScroll({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    // Works in both directions (Arabic scrolls the other way: scrollLeft goes negative).
    const x = Math.abs(el.scrollLeft);
    const next = { start: x > 2, end: x < el.scrollWidth - el.clientWidth - 2 };
    setEdges((e) => (e.start === next.start && e.end === next.end ? e : next));
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += getComputedStyle(el).direction === "rtl" ? -e.deltaY : e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: dir * rtl * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onClick={() => page(dir)}
      className={cn(
        "absolute top-1/2 z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-neutral-200 shadow ring-1 ring-white/15 hover:bg-black group-hover/hscroll:flex [&_svg]:size-4",
        dir === -1 ? "start-0" : "end-0",
      )}
    >
      {dir === -1 ? <ChevronLeft className="rtl:rotate-180" /> : <ChevronRight className="rtl:rotate-180" />}
    </button>
  );

  return (
    <div className="group/hscroll relative" role={label ? "group" : undefined} aria-label={label}>
      {edges.start && arrow(-1)}
      <div
        ref={ref}
        onScroll={measure}
        className={cn("flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
        style={{
          maskImage: `linear-gradient(90deg, ${edges.start ? "transparent, #000 1.5rem" : "#000"}, ${edges.end ? "#000 calc(100% - 1.5rem), transparent" : "#000"})`,
        }}
      >
        {children}
      </div>
      {edges.end && arrow(1)}
    </div>
  );
}
