/**
 * Zoom effects on media clips: a slow camera move across the whole clip (push in, pull out,
 * pans) plus "punch-ins", short zooms onto a point that TikTok edits use for emphasis.
 *
 * Punches are stored in *source* time, so they stay on the same moment of the footage when the
 * clip is split, trimmed or sped up.
 */
import type { Id, MediaClip } from "./project";
import type { Micros } from "./time";

export type ZoomMotion = "none" | "push-in" | "pull-out" | "pan-left" | "pan-right" | "pan-up" | "pan-down";

export const ZOOM_MOTIONS: { id: ZoomMotion; label: string }[] = [
  { id: "none", label: "None" },
  { id: "push-in", label: "Push in" },
  { id: "pull-out", label: "Pull out" },
  { id: "pan-left", label: "Pan left" },
  { id: "pan-right", label: "Pan right" },
  { id: "pan-up", label: "Pan up" },
  { id: "pan-down", label: "Pan down" },
];

/** How a punch-in starts and ends. */
export type PunchStyle = "snap" | "smooth" | "bounce";

export const PUNCH_STYLES: { id: PunchStyle; label: string }[] = [
  { id: "snap", label: "Snap" },
  { id: "smooth", label: "Smooth" },
  { id: "bounce", label: "Bounce" },
];

export interface Punch {
  id: Id;
  /** Source-media time where the punch starts. */
  at: Micros;
  /** How long it stays zoomed in, in timeline time. */
  hold: Micros;
  /** Zoom factor at full punch, e.g. 1.3. */
  scale: number;
  /** Point zoomed into, as a fraction of the canvas. */
  x: number;
  y: number;
  style: PunchStyle;
}

export interface ClipZoom {
  motion: ZoomMotion;
  /** 0–1: how far the camera move goes. */
  strength: number;
  punches: Punch[];
}

export const DEFAULT_ZOOM: ClipZoom = { motion: "none", strength: 0.5, punches: [] };

export const DEFAULT_PUNCH_SCALE = 1.35;
export const DEFAULT_PUNCH_HOLD: Micros = 800_000;

/** Ramp times (timeline) into and out of a punch. */
const RAMP: Record<PunchStyle, Micros> = { snap: 0, smooth: 220_000, bounce: 300_000 };

/** The zoom to apply to a clip's picture at one moment. */
export interface ZoomState {
  /** Uniform scale about (`fx`, `fy`), canvas fractions. */
  scale: number;
  fx: number;
  fy: number;
  /** Offset in canvas fractions, applied after scaling (camera pans). */
  dx: number;
  dy: number;
}

export const NO_ZOOM: ZoomState = { scale: 1, fx: 0.5, fy: 0.5, dx: 0, dy: 0 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const easeOutBack = (p: number) => {
  const c1 = 1.9;
  return 1 + (c1 + 1) * (p - 1) ** 3 + c1 * (p - 1) ** 2;
};

/** Timeline time where a punch starts, for this clip. */
export const punchStart = (clip: MediaClip, punch: Punch): Micros =>
  clip.start + Math.round((punch.at - clip.sourceIn) / clip.speed);

/** Timeline span (start, end) a punch occupies, ramps included. */
export function punchSpan(clip: MediaClip, punch: Punch): [Micros, Micros] {
  const start = punchStart(clip, punch);
  return [start, start + RAMP[punch.style] + punch.hold + RAMP[punch.style]];
}

/** 0 → 1 (or a little over, for bounce) across one punch at timeline time `t`. */
export function punchAmount(clip: MediaClip, punch: Punch, t: Micros): number {
  const start = punchStart(clip, punch);
  const ramp = RAMP[punch.style];
  const u = t - start;
  const total = ramp + punch.hold + ramp;
  if (u < 0 || u >= total) return 0;
  if (ramp === 0) return 1;
  if (u < ramp) {
    const p = u / ramp;
    return punch.style === "bounce" ? easeOutBack(p) : easeInOutSine(p);
  }
  if (u < ramp + punch.hold) return 1;
  const p = (u - ramp - punch.hold) / ramp;
  return 1 - (punch.style === "bounce" ? easeOutCubic(p) : easeInOutSine(p));
}

/** The camera move across the whole clip at timeline time `t`. */
function motionState(clip: MediaClip, t: Micros): ZoomState {
  const { motion, strength } = clip.zoom;
  if (motion === "none" || clip.duration <= 0) return NO_ZOOM;
  const p = easeInOutSine(clamp01((t - clip.start) / clip.duration));
  const s = clamp01(strength);
  switch (motion) {
    case "push-in":
      return { ...NO_ZOOM, scale: 1 + 0.3 * s * p };
    case "pull-out":
      return { ...NO_ZOOM, scale: 1 + 0.3 * s * (1 - p) };
    default: {
      // Pans zoom in just enough that the edges never show while the picture slides.
      const scale = 1 + 0.25 * s;
      const travel = ((scale - 1) / 2) * (2 * p - 1);
      const horizontal = motion === "pan-left" || motion === "pan-right";
      const sign = motion === "pan-left" || motion === "pan-up" ? 1 : -1;
      return { ...NO_ZOOM, scale, dx: horizontal ? sign * -travel : 0, dy: horizontal ? 0 : sign * -travel };
    }
  }
}

/** Camera move and punch-ins combined, for drawing the clip at timeline time `t`. */
export function zoomAt(clip: MediaClip, t: Micros): ZoomState {
  const base = motionState(clip, t);
  let best: Punch | null = null;
  let amount = 0;
  for (const punch of clip.zoom.punches) {
    const a = punchAmount(clip, punch, t);
    if (a > amount) {
      amount = a;
      best = punch;
    }
  }
  if (!best) return base;
  const punchScale = 1 + (best.scale - 1) * amount;
  // Zoom towards the focus point; blend the focus in with the punch so it never jumps.
  const fx = 0.5 + (best.x - 0.5) * clamp01(amount);
  const fy = 0.5 + (best.y - 0.5) * clamp01(amount);
  return { scale: base.scale * punchScale, fx, fy, dx: base.dx, dy: base.dy };
}

/** Whether a punch lands inside the clip's visible part of the source. */
export function punchInClip(clip: MediaClip, punch: Punch): boolean {
  const start = punchStart(clip, punch);
  return start >= clip.start && start < clip.start + clip.duration;
}
