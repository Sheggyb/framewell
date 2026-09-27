import type { TextClip } from "./project";
import type { Micros } from "./time";

/** Offsets applied on top of a text clip's transform at a moment in time. */
export interface TextAnimState {
  opacity: number;
  /** Offsets as fractions of the canvas height. */
  dx: number;
  dy: number;
  /** Uniform scale, then per-axis stretch. */
  scale: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Fraction of text shown (typewriter / word-by-word / erase). */
  reveal: number;
  revealBy: "chars" | "words";
  /** Visible horizontal band of the text box, as fractions (wipes). */
  wipeStart: number;
  wipeEnd: number;
  /** 0–1 strength of the RGB-split glitch effect. */
  glitch: number;
  /** Multiplier for shadow/glow blur. Above 1 adds a glow even without a shadow. */
  glow: number;
  /** Hue rotation in degrees (rainbow). */
  hueShift: number;
  /** 0–1 progress through the clip, used to pick the highlighted word. */
  progress: number;
}

export const STATIC_TEXT_STATE: TextAnimState = {
  opacity: 1,
  dx: 0,
  dy: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  reveal: 1,
  revealBy: "chars",
  wipeStart: 0,
  wipeEnd: 1,
  glitch: 0,
  glow: 1,
  hueShift: 0,
  progress: 0,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;
const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const easeOutElastic = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

function easeOutBounce(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

/** Deterministic noise in [0, 1) so the same frame always renders the same (preview = export). */
const noise = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Gaussian bump centred at c. */
const bump = (x: number, c: number, width: number) => Math.exp(-(((x - c) / width) ** 2));

const SLIDE = 0.06;
const SIDE = 0.3;

export const TEXT_IN_ANIMATIONS = [
  "none",
  "fade",
  "pop",
  "slide-up",
  "slide-down",
  "from-left",
  "from-right",
  "zoom",
  "grow",
  "bounce",
  "elastic",
  "spin",
  "flip",
  "stretch",
  "swing",
  "wipe",
  "typewriter",
  "words",
  "glitch",
  "flash",
  "slam",
  "drop",
  "roll",
  "unfold",
  "shine",
] as const;

export const TEXT_OUT_ANIMATIONS = [
  "none",
  "fade",
  "pop",
  "slide-up",
  "slide-down",
  "to-left",
  "to-right",
  "zoom",
  "spin",
  "flip",
  "fall",
  "wipe",
  "typewriter",
  "glitch",
  "fly",
  "fold",
  "blink",
  "shine",
] as const;

export const TEXT_LOOP_ANIMATIONS = [
  "none",
  "pulse",
  "breathe",
  "heartbeat",
  "wiggle",
  "swing",
  "shake",
  "float",
  "hop",
  "spin",
  "jelly",
  "flicker",
  "glow",
  "rainbow",
  "glitch",
  "tada",
  "orbit",
  "vibrate",
  "strobe",
] as const;

export type TextInAnimation = (typeof TEXT_IN_ANIMATIONS)[number];
export type TextOutAnimation = (typeof TEXT_OUT_ANIMATIONS)[number];
export type TextLoopAnimation = (typeof TEXT_LOOP_ANIMATIONS)[number];

function applyIn(s: TextAnimState, type: TextInAnimation, p: number, sec: number) {
  const e = easeOutCubic(p);
  switch (type) {
    case "fade":
      s.opacity *= e;
      break;
    case "pop":
      s.scale *= 0.4 + 0.6 * easeOutBack(p);
      s.opacity *= clamp01(p * 3);
      break;
    case "slide-up":
      s.dy += (1 - e) * SLIDE;
      s.opacity *= e;
      break;
    case "slide-down":
      s.dy -= (1 - e) * SLIDE;
      s.opacity *= e;
      break;
    case "from-left":
      s.dx -= (1 - e) * SIDE;
      s.opacity *= clamp01(p * 2);
      break;
    case "from-right":
      s.dx += (1 - e) * SIDE;
      s.opacity *= clamp01(p * 2);
      break;
    case "zoom":
      s.scale *= 1 + (1 - e) * 0.8;
      s.opacity *= e;
      break;
    case "grow":
      s.scale *= Math.max(0.01, e);
      s.opacity *= clamp01(p * 4);
      break;
    case "bounce":
      s.dy -= (1 - easeOutBounce(p)) * 0.12;
      s.opacity *= clamp01(p * 4);
      break;
    case "elastic":
      s.scale *= Math.max(0.01, easeOutElastic(p));
      s.opacity *= clamp01(p * 5);
      break;
    case "spin":
      s.rotation -= (1 - e) * 180;
      s.scale *= 0.3 + 0.7 * e;
      s.opacity *= e;
      break;
    case "flip":
      s.scaleX *= Math.max(0.01, easeOutBack(p));
      s.opacity *= clamp01(p * 4);
      break;
    case "stretch":
      s.scaleY *= Math.max(0.01, easeOutBack(p));
      s.scaleX *= 1 + (1 - e) * 0.3;
      s.opacity *= clamp01(p * 4);
      break;
    case "swing":
      s.rotation += 30 * Math.exp(-5 * p) * Math.cos(p * Math.PI * 4);
      s.opacity *= clamp01(p * 5);
      break;
    case "wipe":
      s.wipeEnd = e;
      break;
    case "typewriter":
      s.reveal = p;
      break;
    case "words":
      s.reveal = p;
      s.revealBy = "words";
      break;
    case "glitch": {
      const strength = 1 - p;
      const frame = Math.floor(sec * 30);
      s.glitch = Math.max(s.glitch, strength);
      s.dx += (noise(frame) - 0.5) * 0.04 * strength;
      s.opacity *= noise(frame + 7) < 0.25 * strength ? 0.3 : 1;
      break;
    }
    case "flash":
      s.opacity *= Math.floor(p * 6) % 2 === 0 ? 1 : 0.15;
      break;
    case "slam": {
      // Crashes down from big, with a little shake on impact.
      s.scale *= 1 + (1 - easeOutCubic(clamp01(p * 1.4))) * 1.4;
      s.dx += p > 0.7 ? (noise(Math.floor(sec * 30)) - 0.5) * 0.02 * ((1 - p) / 0.3) : 0;
      s.opacity *= clamp01(p * 3);
      break;
    }
    case "drop":
      s.dy -= (1 - easeOutBack(p)) * 0.18;
      s.rotation -= (1 - e) * 12;
      s.opacity *= clamp01(p * 3);
      break;
    case "roll":
      s.dx -= (1 - e) * SIDE;
      s.rotation -= (1 - e) * 360;
      s.opacity *= clamp01(p * 2);
      break;
    case "unfold":
      s.scaleY *= Math.max(0.01, easeOutElastic(p));
      s.opacity *= clamp01(p * 5);
      break;
    case "shine":
      s.glow *= 1 + (1 - e) * 5;
      s.scale *= 1 + (1 - e) * 0.1;
      s.opacity *= e;
      break;
  }
}

function applyOut(s: TextAnimState, type: TextOutAnimation, q: number, sec: number) {
  // q runs 1 → 0 as the clip ends; r is the eased progress of the exit.
  const r = easeInCubic(1 - q);
  switch (type) {
    case "fade":
      s.opacity *= q;
      break;
    case "pop":
      s.scale *= 1 - 0.6 * r;
      s.opacity *= q;
      break;
    case "slide-up":
      s.dy -= r * SLIDE;
      s.opacity *= q;
      break;
    case "slide-down":
      s.dy += r * SLIDE;
      s.opacity *= q;
      break;
    case "to-left":
      s.dx -= r * SIDE;
      s.opacity *= clamp01(q * 2);
      break;
    case "to-right":
      s.dx += r * SIDE;
      s.opacity *= clamp01(q * 2);
      break;
    case "zoom":
      s.scale *= 1 + r * 0.6;
      s.opacity *= q;
      break;
    case "spin":
      s.rotation += r * 180;
      s.scale *= 1 - 0.7 * r;
      s.opacity *= q;
      break;
    case "flip":
      s.scaleX *= Math.max(0.01, 1 - r);
      break;
    case "fall":
      s.dy += r * 0.25;
      s.rotation += r * 25;
      s.opacity *= clamp01(q * 1.5);
      break;
    case "wipe":
      s.wipeStart = 1 - q;
      break;
    case "typewriter":
      s.reveal = Math.min(s.reveal, q);
      break;
    case "glitch": {
      const frame = Math.floor(sec * 30);
      s.glitch = Math.max(s.glitch, 1 - q);
      s.dx += (noise(frame + 3) - 0.5) * 0.04 * (1 - q);
      s.opacity *= q < 0.15 ? q / 0.15 : 1;
      break;
    }
    case "fly":
      s.dx += r * 0.25;
      s.dy -= r * 0.25;
      s.rotation += r * 30;
      s.opacity *= q;
      break;
    case "fold":
      s.scaleY *= Math.max(0.01, 1 - r);
      break;
    case "blink":
      s.opacity *= (Math.floor((1 - q) * 6) % 2 === 0 ? 1 : 0.15) * clamp01(q * 3);
      break;
    case "shine":
      s.glow *= 1 + r * 5;
      s.scale *= 1 + r * 0.1;
      s.opacity *= q;
      break;
  }
}

function applyLoop(s: TextAnimState, type: TextLoopAnimation, sec: number) {
  const frame = Math.floor(sec * 30);
  switch (type) {
    case "pulse":
      s.scale *= 1 + 0.06 * Math.sin(sec * Math.PI * 3);
      break;
    case "breathe":
      s.scale *= 1 + 0.04 * Math.sin(sec * Math.PI * 0.8);
      break;
    case "heartbeat": {
      const beat = sec % 1.2;
      s.scale *= 1 + 0.09 * (bump(beat, 0.1, 0.06) + 0.7 * bump(beat, 0.32, 0.06));
      break;
    }
    case "wiggle":
      s.rotation += 4 * Math.sin(sec * Math.PI * 4);
      break;
    case "swing":
      s.rotation += 8 * Math.sin(sec * Math.PI * 1.2);
      break;
    case "shake":
      s.dx += (noise(frame) - 0.5) * 0.012;
      s.dy += (noise(frame + 11) - 0.5) * 0.012;
      s.rotation += (noise(frame + 23) - 0.5) * 3;
      break;
    case "float":
      s.dy += 0.012 * Math.sin(sec * Math.PI * 1.6);
      break;
    case "hop":
      s.dy -= 0.025 * Math.abs(Math.sin(sec * Math.PI * 1.5));
      break;
    case "spin":
      s.rotation += (sec * 120) % 360;
      break;
    case "jelly": {
      const w = Math.sin(sec * Math.PI * 2.4);
      s.scaleX *= 1 + 0.07 * w;
      s.scaleY *= 1 - 0.07 * w;
      break;
    }
    case "flicker":
      s.opacity *= 0.72 + 0.28 * Math.abs(Math.sin(sec * 23) * Math.sin(sec * 7.3));
      break;
    case "glow":
      s.glow *= 1 + 0.9 * (0.5 + 0.5 * Math.sin(sec * Math.PI * 2));
      break;
    case "rainbow":
      s.hueShift = (s.hueShift + sec * 120) % 360;
      break;
    case "tada": {
      // A cheer every two seconds: grow and wobble, then rest.
      const t = sec % 2;
      const k = t < 0.6 ? Math.sin((t / 0.6) * Math.PI) : 0;
      s.scale *= 1 + 0.1 * k;
      s.rotation += 5 * Math.sin(t * 40) * k;
      break;
    }
    case "orbit":
      s.dx += 0.01 * Math.cos(sec * Math.PI * 1.5);
      s.dy += 0.01 * Math.sin(sec * Math.PI * 1.5);
      break;
    case "vibrate":
      s.dx += 0.004 * Math.sin(sec * 90);
      break;
    case "strobe":
      s.opacity *= Math.floor(sec * 8) % 2 === 0 ? 1 : 0.35;
      break;
    case "glitch": {
      const burst = Math.floor(sec * 12);
      if (noise(burst) > 0.8) {
        s.glitch = Math.max(s.glitch, 0.7);
        s.dx += (noise(frame + 5) - 0.5) * 0.02;
      }
      break;
    }
  }
}

/** Animation state of a text clip at `localT` microseconds after its start. */
export function textAnimState(clip: Pick<TextClip, "duration" | "animation">, localT: Micros): TextAnimState {
  const a = clip.animation;
  const s: TextAnimState = { ...STATIC_TEXT_STATE };
  const sec = localT / 1_000_000;
  s.progress = clip.duration > 0 ? clamp01(localT / clip.duration) : 0;

  // Squeeze in/out proportionally when the clip is shorter than both together.
  const inD = a.in === "none" ? 0 : a.inDuration;
  const outD = a.out === "none" ? 0 : a.outDuration;
  const fit = inD + outD > clip.duration && inD + outD > 0 ? clip.duration / (inD + outD) : 1;

  if (inD > 0 && localT < inD * fit) applyIn(s, a.in, clamp01(localT / (inD * fit)), sec);
  const remaining = clip.duration - localT;
  if (outD > 0 && remaining < outD * fit) applyOut(s, a.out, clamp01(remaining / (outD * fit)), sec);
  applyLoop(s, a.loop, sec);

  return s;
}
