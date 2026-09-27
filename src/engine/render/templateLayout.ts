/**
 * Makes a template's text layers fit together with the real fonts: layers that are on screen
 * at the same time and would overlap are moved apart, and if they don't fit the frame they
 * are shrunk. Runs once when a template is added (text wraps differently per font and look).
 */
import type { TextClip } from "../model/project";
import { layoutText, type Ctx2D, type FontResolver } from "./text";

const GAP = 18;
const MAX_WIDTH = 0.94;

interface Box {
  clip: TextClip;
  w: number;
  h: number;
}

const overlapsInTime = (a: TextClip, b: TextClip) => a.start < b.start + b.duration && b.start < a.start + a.duration;

export function settleTemplateLayout(
  ctx: Ctx2D,
  clips: TextClip[],
  W: number,
  H: number,
  fonts: FontResolver,
  { top = 0.08, bottom = 0.8 } = {},
): void {
  const originalY = clips.map((c) => c.transform.y);
  for (let attempt = 0; attempt < 8; attempt++) {
    const boxes: Box[] = clips.map((clip) => {
      const layout = layoutText(ctx, clip, W, fonts);
      return { clip, w: layout.boxWidth * clip.transform.scale, h: layout.boxHeight * clip.transform.scale };
    });
    // Too wide for the frame: shrink that layer.
    for (const b of boxes) {
      if (b.w > W * MAX_WIDTH) {
        const k = (W * MAX_WIDTH) / b.w;
        b.clip.transform.scale *= k;
        b.w *= k;
        b.h *= k;
      }
    }

    // Place top to bottom, pushing each layer below anything it collides with.
    clips.forEach((c, i) => (c.transform.y = originalY[i]));
    const order = [...boxes].sort((a, b) => a.clip.transform.y - b.clip.transform.y);
    const placed: Box[] = [];
    for (const box of order) {
      const { clip } = box;
      let cy = Math.max(clip.transform.y * H, top * H + box.h / 2);
      for (const other of placed) {
        if (!overlapsInTime(clip, other.clip)) continue;
        const dx = Math.abs(clip.transform.x * W - other.clip.transform.x * W);
        if (dx >= (box.w + other.w) / 2) continue;
        const oy = other.clip.transform.y * H;
        if (Math.abs(cy - oy) < (box.h + other.h) / 2 + GAP) cy = oy + (box.h + other.h) / 2 + GAP;
      }
      clip.transform.y = cy / H;
      placed.push(box);
    }

    const lowest = Math.max(...placed.map((b) => b.clip.transform.y * H + b.h / 2));
    if (lowest <= bottom * H) return;
    // Doesn't fit: shrink everything a little and lay out again.
    for (const c of clips) c.transform.scale *= 0.88;
  }
}
