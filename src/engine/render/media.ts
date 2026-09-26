/** Drawing and measuring media clips (video frames, photos) with their crop and framing. */
import { gradeParams } from "../model/color";
import type { MediaAsset, MediaClip } from "../model/project";
import type { Micros } from "../model/time";
import { zoomAt } from "../model/zoom";
import { gradeFrame } from "./grade";
import type { Ctx2D } from "./text";

export type DrawableFrame = HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Fit/fill scale for a source region of `sw`×`sh` into a `W`×`H` canvas. */
const baseScale = (clip: MediaClip, sw: number, sh: number, W: number, H: number) =>
  clip.frame.fit === "fill" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);

export interface DrawMediaOptions {
  /** Frame number: keeps film grain identical between preview and export. */
  seed?: number;
  /** Timeline time being drawn; drives camera moves and punch-ins. */
  t?: Micros;
  /** Paint the clip's background fill (blur / colour) first. Main track only. */
  backdrop?: boolean;
}

type Scratch = HTMLCanvasElement | OffscreenCanvas;
const scratch = new Map<string, Scratch>();

/** Reusable offscreen canvases (DOM canvas on the main thread, OffscreenCanvas in workers). */
function scratchCanvas(key: string, w: number, h: number): Scratch {
  let canvas = scratch.get(key);
  if (!canvas) {
    canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(w, h);
    scratch.set(key, canvas);
  }
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return canvas;
}

const context2d = (canvas: Scratch) => canvas.getContext("2d") as Ctx2D | null;

/**
 * A soft, blurred copy of the picture covering the whole frame. Blurs by shrinking and
 * enlarging in steps, which looks the same in every browser (canvas `filter` isn't everywhere).
 */
function drawBlurBackdrop(
  ctx: Ctx2D,
  frame: DrawableFrame,
  [sx, sy, sw, sh]: [number, number, number, number],
  amount: number,
  W: number,
  H: number,
) {
  const qw = Math.max(8, Math.round(W / 4));
  const qh = Math.max(8, Math.round(H / 4));
  const divisor = 10 + Math.min(1, Math.max(0, amount)) * 40;
  const tw = Math.max(3, Math.round(W / divisor));
  const th = Math.max(3, Math.round(H / divisor));
  const quarter = scratchCanvas("quarter", qw, qh);
  const tiny = scratchCanvas("tiny", tw, th);
  const q = context2d(quarter);
  const t = context2d(tiny);
  if (!q || !t) return;
  // Cover the frame with the (cropped) picture, slightly enlarged so soft edges stay outside.
  const cover = Math.max(qw / sw, qh / sh) * 1.08;
  q.imageSmoothingEnabled = t.imageSmoothingEnabled = true;
  q.imageSmoothingQuality = t.imageSmoothingQuality = "high";
  q.clearRect(0, 0, qw, qh);
  q.drawImage(frame, sx, sy, sw, sh, (qw - sw * cover) / 2, (qh - sh * cover) / 2, sw * cover, sh * cover);
  t.clearRect(0, 0, tw, th);
  t.drawImage(quarter, 0, 0, tw, th);
  q.clearRect(0, 0, qw, qh);
  q.drawImage(tiny, 0, 0, qw, qh);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(quarter, 0, 0, W, H);
  // Slightly darker, so the real picture stands out.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * Draws a media clip's frame with its colour grade, background fill, crop, fit/fill, zoom,
 * camera move and punch-ins, position, rotation and flip.
 */
export function drawMedia(
  ctx: Ctx2D,
  source: DrawableFrame | null,
  clip: MediaClip,
  W: number,
  H: number,
  { seed = 0, t, backdrop = false }: DrawMediaOptions = {},
) {
  if (!source || source.width === 0 || source.height === 0) return;
  const grade = gradeParams(clip.color);
  const frame = grade ? gradeFrame(source, grade, seed) : source;
  const { crop, frame: f } = clip;
  const sx = crop.x * frame.width;
  const sy = crop.y * frame.height;
  const sw = Math.max(1, crop.w * frame.width);
  const sh = Math.max(1, crop.h * frame.height);
  const s = baseScale(clip, sw, sh, W, H) * f.scale;

  if (backdrop && clip.backdrop.type === "color") {
    ctx.fillStyle = clip.backdrop.color;
    ctx.fillRect(0, 0, W, H);
  } else if (backdrop && clip.backdrop.type === "blur") {
    drawBlurBackdrop(ctx, frame, [sx, sy, sw, sh], clip.backdrop.blur, W, H);
  }

  ctx.save();
  if (t !== undefined) {
    const z = zoomAt(clip, t);
    if (z.scale !== 1 || z.dx !== 0 || z.dy !== 0) {
      ctx.translate(z.dx * W + z.fx * W, z.dy * H + z.fy * H);
      ctx.scale(z.scale, z.scale);
      ctx.translate(-z.fx * W, -z.fy * H);
    }
  }
  ctx.translate(f.x * W, f.y * H);
  ctx.rotate((f.rotation * Math.PI) / 180);
  if (f.flipH) ctx.scale(-1, 1);
  ctx.drawImage(frame, sx, sy, sw, sh, (-sw * s) / 2, (-sh * s) / 2, sw * s, sh * s);
  ctx.restore();
}

/**
 * On-canvas size of a media clip before its own zoom (`frame.scale`), in canvas pixels.
 * Resolution-independent: only the source's aspect ratio matters.
 */
export function mediaBox(clip: MediaClip, asset: MediaAsset | undefined, W: number, H: number) {
  const aw = asset?.width ?? W;
  const ah = asset?.height ?? H;
  const sw = clip.crop.w * aw;
  const sh = clip.crop.h * ah;
  const s = baseScale(clip, sw, sh, W, H);
  return { w: sw * s, h: sh * s };
}

/** Where the whole, uncropped source sits while editing its crop: centred and fitted. */
export function cropStage(asset: MediaAsset | undefined, W: number, H: number) {
  const aw = asset?.width ?? W;
  const ah = asset?.height ?? H;
  const k = Math.min(W / aw, H / ah) * 0.92;
  const w = aw * k;
  const h = ah * k;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/** Draws the full source for the crop editor. */
export function drawCropStage(ctx: Ctx2D, frame: DrawableFrame | null, asset: MediaAsset | undefined, W: number, H: number) {
  if (!frame) return;
  const stage = cropStage(asset, W, H);
  ctx.drawImage(frame, stage.x, stage.y, stage.w, stage.h);
}
