"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DialTool {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  /** Its panel is open. */
  active?: boolean;
  disabled?: boolean;
  /** Keyboard shortcut, shown in the tooltip. */
  hint?: string;
}

/** Distance between two tools, measured along the arc. */
const SPACING = 64;
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

/**
 * The editor's toolbar: tools ride a shallow arc under a fixed gold ring. Spin it with a thumb
 * (it has momentum and clicks into place), scroll it with a wheel or trackpad, or tap any tool to
 * spin it into the ring and use it at once. `leading` / `trailing` are pinned round buttons on
 * either side (Done and Delete while a clip is selected), so they never need finding.
 */
export function ToolDial({
  tools,
  home,
  leading,
  trailing,
}: {
  tools: DialTool[];
  /** The tool the ring rests on the first time this set of tools appears. */
  home: string;
  leading?: DialTool;
  trailing?: DialTool;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(0);
  const motion = useRef({ pos: 0, vel: 0, target: 0, raf: 0, last: 0, detent: 0, haptic: false });
  const drag = useRef<{ id: number; x: number; from: number; moved: boolean; samples: { t: number; p: number }[] } | null>(null);
  const suppressClick = useRef(false);
  // Where the ring was left for each set of tools, so going back to one finds it as you left it.
  const memory = useRef(new Map<string, number>());
  const key = tools.map((t) => t.id).join("|");
  const keyRef = useRef(key);
  const max = tools.length - 1;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** A light tick each time a tool clicks into the ring (Android; iPhone has no web vibration). */
  const detent = useCallback((p: number) => {
    const m = motion.current;
    const d = Math.round(p);
    if (d === m.detent) return;
    m.detent = d;
    if (m.haptic && d >= 0 && d <= max) navigator.vibrate?.(4);
  }, [max]);

  /** Springs `pos` to `target`; picks up target changes made while it runs. */
  const run = useCallback(() => {
    const m = motion.current;
    if (m.raf) return;
    if (reducedMotion()) {
      m.pos = m.target;
      m.vel = 0;
      memory.current.set(keyRef.current, m.target);
      setPos(m.pos);
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
      if (Math.abs(m.target - m.pos) < 0.002 && Math.abs(m.vel) < 0.02) {
        m.pos = m.target;
        m.vel = 0;
        m.raf = 0;
        m.haptic = false;
        memory.current.set(keyRef.current, m.target);
        setPos(m.pos);
        return;
      }
      setPos(m.pos);
      m.raf = requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
  }, [detent]);

  const spinTo = useCallback(
    (i: number) => {
      const m = motion.current;
      m.target = clamp(i, 0, max);
      m.haptic = true;
      run();
    },
    [max, run],
  );

  // A new set of tools (a clip was selected, or let go) spins in from the side.
  useLayoutEffect(() => {
    keyRef.current = key;
    const m = motion.current;
    const rest = memory.current.get(key) ?? Math.max(0, tools.findIndex((t) => t.id === home));
    cancelAnimationFrame(m.raf);
    m.raf = 0;
    m.pos = rest + 1.5;
    m.detent = Math.round(m.pos);
    m.vel = 0;
    m.target = rest;
    m.haptic = false;
    run();
    // Only when the set of tools changes, not on every render of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A panel opened some other way (a keyboard shortcut) brings its tool into the ring.
  const activeIndex = tools.findIndex((t) => t.active);
  useEffect(() => {
    if (activeIndex >= 0 && !drag.current?.moved) spinTo(activeIndex);
  }, [activeIndex, spinTo]);

  // Mouse wheel and trackpad spin it too.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let settle = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const m = motion.current;
      m.target = clamp(m.target + delta / SPACING / 2, 0, max);
      m.haptic = true;
      run();
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        m.target = Math.round(m.target);
        run();
      }, 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(settle);
    };
  }, [max, run]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    suppressClick.current = false;
    drag.current = { id: e.pointerId, x: e.clientX, from: motion.current.pos, moved: false, samples: [] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
      m.haptic = true;
    }
    const raw = d.from - dx / SPACING;
    // Past either end it stretches instead of stopping dead.
    const p = raw < 0 ? raw * 0.3 : raw > max ? max + (raw - max) * 0.3 : raw;
    m.pos = m.target = p;
    detent(p);
    d.samples.push({ t: e.timeStamp, p });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
    setPos(p);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
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
    // A flick carries on a few tools before it settles.
    m.target = clamp(Math.round(m.pos + m.vel * 0.14), 0, max);
    run();
  };

  const focus = clamp(Math.round(pos), 0, max);
  const cx = width / 2;
  const cy = RING_Y + RADIUS;
  const edgeY = cy - Math.sqrt(Math.max(0, RADIUS * RADIUS - cx * cx));

  // Fine ticks between the tools, turning with the dial.
  const ticks: number[] = [];
  for (let k = Math.floor(pos - 5); k <= Math.ceil(pos + 5); k++) ticks.push(k + 0.5);

  return (
    <div className="mx-auto flex w-full max-w-xl items-stretch">
      {leading && <DockButton tool={leading} />}
      <div
        ref={ref}
        role="toolbar"
        aria-label="Tools"
        className="relative min-w-0 flex-1 touch-none select-none overflow-hidden"
        style={{
          height: HEIGHT,
          visibility: width ? undefined : "hidden",
          // Fade the arc out at both ends.
          maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <svg className="pointer-events-none absolute inset-0" width={width} height={HEIGHT} aria-hidden>
          <path d={`M 0 ${edgeY} A ${RADIUS} ${RADIUS} 0 0 1 ${width} ${edgeY}`} fill="none" stroke="rgba(255,255,255,0.1)" />
          {ticks.map((t) => {
            const a = ((t - pos) * SPACING) / RADIUS;
            const sin = Math.sin(a);
            const cos = Math.cos(a);
            return (
              <line
                key={t}
                x1={cx + (RADIUS - 3) * sin}
                y1={cy - (RADIUS - 3) * cos}
                x2={cx + (RADIUS + 3) * sin}
                y2={cy - (RADIUS + 3) * cos}
                stroke="rgba(255,255,255,0.16)"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* The ring stays put; tools pass through it. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute rounded-full border-[1.5px] border-gold/80 transition-[background-color,box-shadow] duration-200",
            tools[focus]?.active ? "bg-gold" : "bg-[#17150f]",
          )}
          style={{
            left: cx - RING / 2,
            top: RING_Y - RING / 2,
            width: RING,
            height: RING,
            boxShadow: tools[focus]?.active
              ? "0 0 0 5px rgba(226,191,126,0.14), 0 8px 28px -6px rgba(226,191,126,0.7)"
              : "0 0 0 5px rgba(226,191,126,0.06), 0 8px 28px -10px rgba(226,191,126,0.45)",
          }}
        />

        {tools.map((tool, i) => {
          const d = i - pos;
          const ad = Math.abs(d);
          const a = (d * SPACING) / RADIUS;
          const x = cx + RADIUS * Math.sin(a);
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
                spinTo(i);
                if (!tool.disabled) tool.onSelect();
              }}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && spinTo(i)}
              className="absolute flex flex-col items-center outline-none"
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
                <span className="[&_svg]:size-full" style={{ width: 19 + 5 * f, height: 19 + 5 * f }}>
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
      </div>
      {trailing && <DockButton tool={trailing} danger />}
    </div>
  );
}

/** A round button pinned beside the dial. */
function DockButton({ tool, danger }: { tool: DialTool; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={tool.onSelect}
      disabled={tool.disabled}
      title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
      className={cn(
        "group flex w-14 shrink-0 flex-col items-center gap-1 pt-3.5 text-[10px] font-medium animate-[fw-dock_0.28s_cubic-bezier(.2,1.4,.4,1)] disabled:opacity-30",
        danger ? "text-red-300/90" : "text-neutral-300",
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full ring-1 transition-transform group-active:scale-90 [&_svg]:size-[18px]",
          danger ? "bg-red-500/10 ring-red-400/25" : "bg-white/[0.06] ring-white/10",
        )}
      >
        {tool.icon}
      </span>
      {tool.label}
    </button>
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
