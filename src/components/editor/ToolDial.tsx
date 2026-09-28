"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DialTool {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  /** Its panel is open, or (in a picker) it is the current value. */
  active?: boolean;
  disabled?: boolean;
  /** Keyboard shortcut, shown in the tooltip. */
  hint?: string;
}

/** Distance between two tools, measured along the arc. */
const SPACING = 64;
/** Distance between two knob steps. */
const KNOB_SPACING = 11;
/** Radius of the arc the tools ride on: bigger is flatter. */
const RADIUS = 720;
/** Diameter of the gold focus ring, and of a tool resting elsewhere on the arc. */
const RING = 52;
const CHIP = 38;
const RING_Y = 6 + RING / 2;
const HEIGHT = 80;

const GOLD = "#e2bf7e";
const REST = "#a1a1a1";
const INK = "#09090b";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rest grey → gold as a tool moves into the ring. */
const tint = (f: number) => `color-mix(in oklab, ${GOLD} ${Math.round(f * 100)}%, ${REST})`;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Motion {
  pos: number;
  vel: number;
  target: number;
  raf: number;
  last: number;
  /** The step last seen in the ring. */
  detent: number;
  /** The current movement was started by the user (reported through `onDetent`). */
  user: boolean;
}

/**
 * The physics shared by the tool dial and the knob: drag with momentum, snapping to whole steps
 * with a slight bounce, stretch past either end, wheel/trackpad scrolling.
 * `onDetent(step, settled)` reports each step the user moves into the ring, and `settled` once it
 * comes to rest there.
 */
function useDialMotion({
  max,
  spacing,
  initial = 0,
  onDetent,
  onSettle,
}: {
  max: number;
  spacing: number;
  initial?: number;
  onDetent?: (step: number, settled: boolean) => void;
  onSettle?: (step: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(initial);
  const motion = useRef<Motion>({ pos: initial, vel: 0, target: initial, raf: 0, last: 0, detent: initial, user: false });
  const drag = useRef<{ id: number; x: number; from: number; moved: boolean; samples: { t: number; p: number }[] } | null>(null);
  const suppressClick = useRef(false);
  const callbacks = useRef({ onDetent, onSettle });
  useLayoutEffect(() => {
    callbacks.current = { onDetent, onSettle };
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** A light tick each time a step clicks into the ring (Android; iPhone has no web vibration). */
  const detent = useCallback(
    (p: number) => {
      const m = motion.current;
      const d = Math.round(p);
      if (d === m.detent) return;
      m.detent = d;
      if (!m.user || d < 0 || d > max) return;
      navigator.vibrate?.(spacing < 20 ? 2 : 4);
      callbacks.current.onDetent?.(d, false);
    },
    [max, spacing],
  );

  const settle = useCallback(() => {
    const m = motion.current;
    m.pos = m.target;
    m.vel = 0;
    m.raf = 0;
    setPos(m.pos);
    if (!Number.isInteger(m.target)) return;
    if (m.user) callbacks.current.onDetent?.(m.target, true);
    m.user = false;
    callbacks.current.onSettle?.(m.target);
  }, []);

  /** Springs `pos` to `target`; picks up target changes made while it runs. */
  const run = useCallback(() => {
    const m = motion.current;
    if (m.raf) return;
    if (reducedMotion()) {
      detent(m.target);
      settle();
      return;
    }
    m.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - m.last) / 1000);
      m.last = now;
      // Slightly under-damped: settles with the smallest bounce, like a detent.
      m.vel += ((m.target - m.pos) * 260 - m.vel * 27) * dt;
      m.pos += m.vel * dt;
      detent(m.pos);
      if (Math.abs(m.target - m.pos) < 0.002 && Math.abs(m.vel) < 0.02) return settle();
      setPos(m.pos);
      m.raf = requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
  }, [detent, settle]);

  const spinTo = useCallback(
    (i: number, user = true) => {
      const m = motion.current;
      m.target = clamp(i, 0, max);
      m.user = user;
      run();
    },
    [max, run],
  );

  /** Being dragged or flung by the user: outside changes must not fight them. */
  const busy = useCallback(() => Boolean(drag.current?.moved || (motion.current.raf && motion.current.user)), []);

  /** The step it is heading for. */
  const target = useCallback(() => motion.current.target, []);

  /** Starts `offset` steps away from `rest` and spins in to it, without reporting steps. */
  const enter = useCallback(
    (rest: number, offset: number) => {
      const m = motion.current;
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      m.pos = rest + offset;
      m.detent = Math.round(m.pos);
      m.vel = 0;
      m.target = clamp(rest, 0, max);
      m.user = false;
      run();
    },
    [max, run],
  );

  // Mouse wheel and trackpad spin it too.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const m = motion.current;
      m.target = clamp(m.target + delta / spacing / 2, 0, max);
      m.user = true;
      run();
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        m.target = Math.round(m.target);
        m.user = true;
        run();
      }, 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, [max, spacing, run]);

  const bind = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const m = motion.current;
      // Touching a spinning dial stops it (like any iOS list) instead of pressing whatever
      // tool happens to be passing under the finger.
      const spinning = Boolean(m.raf && m.user && Math.abs(m.vel) > 1.5);
      suppressClick.current = spinning;
      if (spinning) {
        cancelAnimationFrame(m.raf);
        m.raf = 0;
        m.vel = 0;
        m.target = clamp(Math.round(m.pos), 0, max);
        run();
      }
      drag.current = { id: e.pointerId, x: e.clientX, from: motion.current.pos, moved: false, samples: [] };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const m = motion.current;
      if (!d.moved) {
        if (Math.abs(dx) < 6) return;
        d.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        cancelAnimationFrame(m.raf);
        m.raf = 0;
        m.user = true;
      }
      const raw = d.from - dx / spacing;
      // Past either end it stretches instead of stopping dead.
      const p = raw < 0 ? raw * 0.3 : raw > max ? max + (raw - max) * 0.3 : raw;
      m.pos = m.target = p;
      detent(p);
      d.samples.push({ t: e.timeStamp, p });
      while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
      setPos(p);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      if (!d.moved) return;
      suppressClick.current = true;
      const first = d.samples[0];
      const last = d.samples[d.samples.length - 1];
      const dt = last && first && last.t > first.t ? (last.t - first.t) / 1000 : 0;
      const m = motion.current;
      m.vel = dt ? (last.p - first.p) / dt : 0;
      // A flick carries on a few steps before it settles.
      m.target = clamp(Math.round(m.pos + m.vel * 0.14), 0, max);
      m.user = true;
      run();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };

  return { ref, width, pos, spinTo, busy, target, enter, bind: { ...bind, onPointerCancel: bind.onPointerUp } };
}

type Dial = ReturnType<typeof useDialMotion>;

/** The touch surface both dials draw on, faded out at both ends. */
function Surface({
  surfaceRef,
  width,
  bind,
  label,
  children,
  a11y,
}: {
  surfaceRef: Dial["ref"];
  width: number;
  bind: Dial["bind"];
  label: string;
  children: ReactNode;
  /** Overrides for screen readers and keyboards (the knob is a slider, not a toolbar). */
  a11y?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      ref={surfaceRef}
      role="toolbar"
      aria-label={label}
      {...a11y}
      className="relative min-w-0 flex-1 touch-none select-none overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
      // Focusing an off-screen tool must spin the dial, never scroll its surface sideways.
      onScroll={(e) => {
        e.currentTarget.scrollLeft = 0;
      }}
      style={{
        height: HEIGHT,
        overflow: "clip",
        visibility: width ? undefined : "hidden",
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
      {...bind}
    >
      {children}
    </div>
  );
}

/** The arc line with fine ticks turning with the dial. */
function Arc({ width, pos, spacing, from, to, major }: { width: number; pos: number; spacing: number; from: number; to: number; major?: number }) {
  const cx = width / 2;
  const cy = RING_Y + RADIUS;
  const edgeY = cy - Math.sqrt(Math.max(0, RADIUS * RADIUS - cx * cx));
  const reach = width / 2 / spacing + 1;
  const ticks: number[] = [];
  for (let k = Math.max(from, Math.floor(pos - reach)); k <= Math.min(to, Math.ceil(pos + reach)); k++) ticks.push(k);
  return (
    <svg className="pointer-events-none absolute inset-0" width={width} height={HEIGHT} aria-hidden>
      <path d={`M 0 ${edgeY} A ${RADIUS} ${RADIUS} 0 0 1 ${width} ${edgeY}`} fill="none" stroke="rgba(255,255,255,0.1)" />
      {ticks.map((t) => {
        const a = ((t - pos) * spacing) / RADIUS;
        const sin = Math.sin(a);
        const cos = Math.cos(a);
        const big = major !== undefined && t % major === 0;
        const len = major === undefined ? 3 : big ? 9 : 4;
        return (
          <line
            key={t}
            x1={cx + (RADIUS - len) * sin}
            y1={cy - (RADIUS - len) * cos}
            x2={cx + (RADIUS + len) * sin}
            y2={cy - (RADIUS + len) * cos}
            stroke={big ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)"}
            strokeWidth={big ? 1.5 : 1}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function Ring({ width, filled, children }: { width: number; filled?: boolean; children?: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute flex items-center justify-center rounded-full border-[1.5px] border-gold/80 transition-[background-color,box-shadow] duration-200",
        filled ? "bg-gold" : "bg-[#17150f]",
      )}
      style={{
        left: width / 2 - RING / 2,
        top: RING_Y - RING / 2,
        width: RING,
        height: RING,
        boxShadow: filled
          ? "0 0 0 5px rgba(226,191,126,0.14), 0 8px 28px -6px rgba(226,191,126,0.7)"
          : "0 0 0 5px rgba(226,191,126,0.06), 0 8px 28px -10px rgba(226,191,126,0.45)",
      }}
    >
      {children}
    </div>
  );
}

/** Where each set of tools was left, so coming back to it finds it as you left it. */
const memory = new Map<string, number>();

/**
 * Tools (or a picker's choices) ride a shallow arc under a fixed gold ring. Spin it with a thumb,
 * scroll it with a wheel or trackpad, or tap any item to spin it into the ring and use it at once.
 */
export function ToolDial({
  tools,
  home,
  remember = true,
  enterFrom = 1.5,
  onFocus,
  label = "Tools",
}: {
  tools: DialTool[];
  /** The item the ring rests on when this set appears (unless it remembers another). */
  home: string;
  /** Come back to where this set was left, instead of `home`. */
  remember?: boolean;
  /** Which side the items spin in from, in steps. */
  enterFrom?: number;
  /** Each item the user spins into the ring (a picker previews it live), then once it settles. */
  onFocus?: (tool: DialTool, settled: boolean) => void;
  label?: string;
}) {
  const key = tools.map((t) => t.id).join("|");
  const max = tools.length - 1;
  const toolsRef = useRef(tools);
  const keyRef = useRef(key);
  useLayoutEffect(() => {
    toolsRef.current = tools;
    keyRef.current = key;
  });
  const { ref, bind, pos, width, spinTo, busy, enter } = useDialMotion({
    max,
    spacing: SPACING,
    onDetent: (i, settled) => {
      const tool = toolsRef.current[i];
      if (tool && !tool.disabled) onFocus?.(tool, settled);
    },
    onSettle: (i) => memory.set(keyRef.current, i),
  });

  // A new set of tools (a clip was selected, a picker opened) spins in from the side.
  useLayoutEffect(() => {
    const homeIndex = Math.max(0, tools.findIndex((t) => t.id === home));
    enter((remember ? memory.get(key) : undefined) ?? homeIndex, enterFrom);
    // Only when the set of tools changes, not on every render of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A panel opened some other way, or a value picked outside the dial, spins into the ring.
  const activeIndex = tools.findIndex((t) => t.active);
  useEffect(() => {
    if (activeIndex >= 0 && !busy()) spinTo(activeIndex, false);
  }, [activeIndex, busy, spinTo]);

  const focus = clamp(Math.round(pos), 0, max);

  return (
    <Surface surfaceRef={ref} width={width} bind={bind} label={label}>
      <Arc width={width} pos={pos} spacing={SPACING} from={-10} to={max + 10} />
      <Ring width={width} filled={tools[focus]?.active} />
      {tools.map((tool, i) => {
        const d = i - pos;
        const ad = Math.abs(d);
        const a = (d * SPACING) / RADIUS;
        const x = width / 2 + RADIUS * Math.sin(a);
        const y = RING_Y + RADIUS * (1 - Math.cos(a));
        const f = Math.max(0, 1 - ad);
        const size = CHIP + (RING - CHIP) * f;
        const inRing = ad < 0.5;
        const fade = ad <= 1 ? 1 : clamp(1 - (ad - 1) * 0.28, 0.15, 1);
        return (
          <button
            key={tool.id}
            type="button"
            aria-label={tool.label}
            aria-pressed={tool.active ?? undefined}
            aria-disabled={tool.disabled || undefined}
            title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
            onClick={() => {
              spinTo(i, false);
              if (!tool.disabled) tool.onSelect();
            }}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && spinTo(i, false)}
            // One Tab stop for the whole dial; arrow keys move along it (and preview like a spin).
            tabIndex={i === focus ? 0 : -1}
            data-dial-index={i}
            onKeyDown={(e) => {
              const next =
                e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? max : null;
              if (next === null) return;
              e.preventDefault();
              e.stopPropagation();
              const n = clamp(next, 0, max);
              spinTo(n, true);
              e.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-dial-index="${n}"]`)?.focus();
            }}
            className="absolute flex flex-col items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            style={{
              left: x,
              top: y - size / 2,
              transform: "translateX(-50%)",
              opacity: tool.disabled ? fade * 0.35 : fade,
              zIndex: Math.round(20 - ad),
            }}
          >
            <span
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: size,
                height: size,
                color: tool.active && inRing ? INK : tint(f),
                background: `rgba(21,21,25,${1 - f})`,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.09 * (1 - f)})`,
              }}
            >
              <span
                className="flex items-center justify-center whitespace-nowrap leading-none [&_svg]:size-full"
                style={{ width: 19 + 5 * f, height: 19 + 5 * f, fontSize: 15 + 4 * f }}
              >
                {tool.icon}
              </span>
              {tool.active && !inRing && <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-gold" />}
            </span>
            <span
              className="absolute whitespace-nowrap font-medium"
              style={{
                top: size + 3,
                fontSize: 10 + f,
                color: inRing ? GOLD : REST,
                opacity: clamp(1.7 - ad, 0, 1) * (inRing ? 1 : 0.8),
              }}
            >
              {tool.label}
            </span>
          </button>
        );
      })}
    </Surface>
  );
}

/**
 * A value on a ruler: spin it like the dial, one tick per step, with the value in the ring.
 * `onChange(value, settled)` fires for every step the user turns through.
 */
export function KnobDial({
  label,
  value,
  min,
  max,
  step,
  major = 5,
  format = (v) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** A long tick every this many steps. */
  major?: number;
  format?: (v: number) => string;
  onChange: (value: number, settled: boolean) => void;
}) {
  const steps = Math.round((max - min) / step);
  const index = clamp(Math.round((value - min) / step), 0, steps);
  const toValue = (i: number) => Math.round((min + i * step) * 1000) / 1000;
  const { ref, bind, pos, width, spinTo, busy, target } = useDialMotion({
    max: steps,
    spacing: KNOB_SPACING,
    initial: index,
    onDetent: (i, settled) => onChange(toValue(i), settled),
  });

  // Changed from outside (a size chip, the More sheet): turn to it.
  useEffect(() => {
    if (!busy() && Math.round(target()) !== index) spinTo(index, false);
  }, [index, busy, spinTo, target]);

  const current = toValue(clamp(Math.round(pos), 0, steps));
  const a11y: React.HTMLAttributes<HTMLDivElement> = {
    role: "slider",
    tabIndex: 0,
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-valuenow": current,
    "aria-valuetext": format(current),
    onKeyDown: (e) => {
      const at = Math.round(target());
      const next =
        e.key === "ArrowRight" || e.key === "ArrowUp"
          ? at + 1
          : e.key === "ArrowLeft" || e.key === "ArrowDown"
            ? at - 1
            : e.key === "PageUp"
              ? at + major
              : e.key === "PageDown"
                ? at - major
                : e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? steps
                    : null;
      if (next === null) return;
      e.preventDefault();
      e.stopPropagation();
      spinTo(clamp(next, 0, steps), true);
    },
  };

  return (
    <Surface surfaceRef={ref} width={width} bind={bind} label={label} a11y={a11y}>
      <Arc width={width} pos={pos} spacing={KNOB_SPACING} from={0} to={steps} major={major} />
      <Ring width={width}>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-gold">{format(current)}</span>
      </Ring>
      <span
        className="pointer-events-none absolute text-[11px] font-medium text-gold"
        style={{ left: width / 2, top: RING_Y + RING / 2 + 4, transform: "translateX(-50%)" }}
      >
        {label}
      </span>
    </Surface>
  );
}

export type DockTone = "plain" | "danger" | "confirm";

const DOCK_TONES: Record<DockTone, { label: string; chip: string }> = {
  plain: { label: "text-neutral-300", chip: "bg-white/[0.06] ring-white/10" },
  danger: { label: "text-red-300/90", chip: "bg-red-500/10 ring-red-400/25" },
  confirm: { label: "font-semibold text-gold", chip: "bg-gold text-neutral-950 ring-gold shadow-[0_6px_20px_-6px_rgba(226,191,126,0.8)]" },
};

/** A round button pinned beside the dial. */
function DockButton({ tool, tone = "plain" }: { tool: DialTool; tone?: DockTone }) {
  return (
    <button
      type="button"
      onClick={tool.onSelect}
      disabled={tool.disabled}
      title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
      className={cn(
        "group flex w-14 shrink-0 flex-col items-center gap-1 pt-3.5 text-[10px] font-medium animate-[fw-dock_0.28s_cubic-bezier(.2,1.4,.4,1)] disabled:opacity-30",
        DOCK_TONES[tone].label,
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full ring-1 transition-transform group-active:scale-90 [&_svg]:size-[18px]",
          DOCK_TONES[tone].chip,
        )}
      >
        {tool.icon}
      </span>
      {tool.label}
    </button>
  );
}

/**
 * A dial with round buttons pinned either side (Done / Delete, Cancel / Add), so the ways out
 * never need finding.
 */
export function DialRow({
  leading,
  trailing,
  trailingTone = "danger",
  children,
}: {
  leading?: DialTool;
  trailing?: DialTool;
  trailingTone?: DockTone;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl items-stretch">
      {leading && <DockButton key={leading.id} tool={leading} />}
      {children}
      {trailing && <DockButton key={trailing.id} tool={trailing} tone={trailingTone} />}
    </div>
  );
}

export interface PickerChip {
  id: string;
  label: ReactNode;
  active?: boolean;
  onSelect: () => void;
}

/** Shortcuts above a picker dial: jump to a group, or switch what the dial changes. */
export function PickerChips({ chips }: { chips: PickerChip[] }) {
  return (
    <div className="flex justify-center overflow-x-auto px-3 pt-2 [scrollbar-width:none]">
      <div className="flex shrink-0 gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={chip.active}
            onClick={chip.onSelect}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs transition-colors [&_svg]:size-3.5",
              chip.active ? "bg-gold/15 font-semibold text-gold" : "bg-white/[0.05] text-neutral-400 hover:text-neutral-200",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type ToolbarStyle = "dial" | "classic";
const STYLE_KEY = "framewell:toolbar";
const STYLE_EVENT = "framewell:toolbar";

/** Dial or the classic row of buttons, remembered on this device. */
export function useToolbarStyle(): ToolbarStyle {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(STYLE_EVENT, onChange);
      return () => window.removeEventListener(STYLE_EVENT, onChange);
    },
    () => {
      try {
        return localStorage.getItem(STYLE_KEY) === "classic" ? "classic" : "dial";
      } catch {
        return "dial";
      }
    },
    () => "dial",
  );
}

export function setToolbarStyle(style: ToolbarStyle): void {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    // Storage unavailable (private mode): stays as it was.
  }
  window.dispatchEvent(new Event(STYLE_EVENT));
}
