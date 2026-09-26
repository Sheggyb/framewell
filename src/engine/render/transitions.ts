/**
 * Transitions between consecutive main-track clips. A transition is stored on the
 * incoming clip and is centred on the cut. The outgoing clip holds its last frame after
 * the cut and the incoming clip holds its first frame before it, so transitions never
 * change the timeline length.
 */
import { clipEnd } from "../model/ops";
import type { Clip, MediaClip, Track } from "../model/project";
import type { Micros } from "../model/time";
import type { TransitionType } from "../model/transition";
import type { Ctx2D } from "./text";

export interface ActiveTransition {
  from: MediaClip;
  to: MediaClip;
  type: TransitionType;
  /** 0 → 1 across the transition. */
  progress: number;
  /** Timeline times to sample each clip at (clamped inside the clip). */
  fromTime: Micros;
  toTime: Micros;
}

/** Whether two consecutive clips meet at a cut (a gap between them has no transition). */
export const clipsTouch = (from: MediaClip | Clip, to: MediaClip | Clip) => Math.abs(clipEnd(from) - to.start) <= 1000;

/** The transition playing at `t` on the main track, if any. */
export function transitionAt(track: Track, t: Micros): ActiveTransition | null {
  for (let i = 1; i < track.clips.length; i++) {
    const to = track.clips[i];
    const from = track.clips[i - 1];
    if (to.type !== "media" || from.type !== "media" || !to.transition || !clipsTouch(from, to)) continue;
    // Never longer than either clip allows.
    const half = Math.min(to.transition.duration, from.duration, to.duration) / 2;
    const cut = to.start;
    if (half <= 0 || t < cut - half || t >= cut + half) continue;
    return {
      from,
      to,
      type: to.transition.type,
      progress: (t - (cut - half)) / (half * 2),
      fromTime: Math.min(t, clipEnd(from) - 1),
      toTime: Math.max(t, to.start),
    };
  }
  return null;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

interface Layer {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  alpha?: number;
}

/**
 * Draws one transition frame. `drawFrom` / `drawTo` paint each clip's frame over the
 * whole canvas; this function positions, fades and masks them.
 */
export function drawTransition(
  ctx: Ctx2D,
  type: TransitionType,
  progress: number,
  width: number,
  height: number,
  drawFrom: () => void,
  drawTo: () => void,
) {
  const p = Math.min(1, Math.max(0, progress));
  const e = easeInOut(p);

  const layer = (draw: () => void, { x = 0, y = 0, scale = 1, rotation = 0, alpha = 1 }: Layer) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, alpha);
    ctx.translate(width / 2 + x, height / 2 + y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
    draw();
    ctx.restore();
  };
  const overlay = (color: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  };
  const masked = (path: () => void) => {
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    drawTo();
    ctx.restore();
  };

  switch (type) {
    case "crossfade":
      drawFrom();
      layer(drawTo, { alpha: p });
      break;
    case "dip-black":
    case "dip-white": {
      const color = type === "dip-black" ? "#000" : "#fff";
      if (p < 0.5) {
        drawFrom();
        overlay(color, p * 2);
      } else {
        drawTo();
        overlay(color, (1 - p) * 2);
      }
      break;
    }
    case "flash":
      drawFrom();
      layer(drawTo, { alpha: p });
      overlay("#fff", 0.9 * (1 - Math.abs(p - 0.5) * 2));
      break;
    case "slide-left":
      drawFrom();
      layer(drawTo, { x: (1 - e) * width });
      break;
    case "slide-up":
      drawFrom();
      layer(drawTo, { y: (1 - e) * height });
      break;
    case "push-left":
      layer(drawFrom, { x: -e * width });
      layer(drawTo, { x: (1 - e) * width });
      break;
    case "whip": {
      const w = easeInOutQuart(p);
      // Motion streaks: faint copies trailing each layer at speed.
      const speed = Math.sin(p * Math.PI);
      for (const ghost of [0.08, 0.04]) {
        layer(drawFrom, { x: -w * width + ghost * width * speed, alpha: 0.35 * speed });
        layer(drawTo, { x: (1 - w) * width + ghost * width * speed, alpha: 0.35 * speed });
      }
      layer(drawFrom, { x: -w * width });
      layer(drawTo, { x: (1 - w) * width });
      break;
    }
    case "zoom-in":
      layer(drawFrom, { scale: 1 + e * 0.6, alpha: 1 - p });
      layer(drawTo, { scale: 1.3 - 0.3 * e, alpha: p });
      break;
    case "zoom-out":
      layer(drawFrom, { scale: 1 - e * 0.3, alpha: 1 - p });
      layer(drawTo, { scale: 0.7 + 0.3 * e, alpha: p });
      break;
    case "wipe":
      drawFrom();
      masked(() => ctx.rect(0, 0, width * e, height));
      break;
    case "circle":
      drawFrom();
      masked(() => ctx.arc(width / 2, height / 2, (e * Math.hypot(width, height)) / 2, 0, Math.PI * 2));
      break;
    case "spin":
      if (p < 0.5) layer(drawFrom, { rotation: e * 180, scale: 1 - e * 1.6 + 0.001 });
      else layer(drawTo, { rotation: (e - 1) * 180, scale: (e - 0.5) * 2 + 0.001 });
      break;
  }
}
