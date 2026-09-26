/** Drawing and measuring media clips (video frames, photos) with their crop and framing. */
import { gradeParams } from "../model/color";
import type { MediaAsset, MediaClip } from "../model/project";
import { gradeFrame } from "./grade";
import type { Ctx2D } from "./text";

export type DrawableFrame = HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Fit/fill scale for a source region of `sw`×`sh` into a `W`×`H` canvas. */
const baseScale = (clip: MediaClip, sw: number, sh: number, W: number, H: number) =>
  clip.frame.fit === "fill" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);

/**
 * Draws a media clip's frame with its colour grade, crop, fit/fill, zoom, position, rotation
 * and flip. `seed` (the frame number) keeps film grain identical between preview and export.
 */
export function drawMedia(ctx: Ctx2D, source: DrawableFrame | null, clip: MediaClip, W: number, H: number, seed = 0) {
  if (!source || source.width === 0 || source.height === 0) return;
  const grade = gradeParams(clip.color);
  const frame = grade ? gradeFrame(source, grade, seed) : source;
  const { crop, frame: f } = clip;
  const sx = crop.x * frame.width;
  const sy = crop.y * frame.height;
  const sw = Math.max(1, crop.w * frame.width);
  const sh = Math.max(1, crop.h * frame.height);
  const s = baseScale(clip, sw, sh, W, H) * f.scale;
  ctx.save();
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
