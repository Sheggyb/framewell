/**
 * All timeline math uses integer microseconds. Floating-point seconds drift
 * and cause off-by-one-frame bugs, so convert only at API boundaries
 * (Mediabunny, Web Audio) that expect seconds.
 */
export type Micros = number;

export const US_PER_SECOND = 1_000_000;

export const secondsToUs = (seconds: number): Micros => Math.round(seconds * US_PER_SECOND);

export const usToSeconds = (us: Micros): number => us / US_PER_SECOND;

export const usToFrame = (us: Micros, fps: number): number => Math.round((us * fps) / US_PER_SECOND);

export const frameToUs = (frame: number, fps: number): Micros =>
  Math.round((frame * US_PER_SECOND) / fps);

/** Rounds a time to the nearest frame boundary at the given fps. */
export const snapToFrame = (us: Micros, fps: number): Micros => frameToUs(usToFrame(us, fps), fps);

/** Duration of one frame. Not an integer for most frame rates, so only use it for comparisons. */
export const frameDuration = (fps: number): number => US_PER_SECOND / fps;

export const clampUs = (us: Micros, min: Micros, max: Micros): Micros =>
  Math.min(max, Math.max(min, us));

/** Formats as `MM:SS:FF` (minutes, seconds, frames). */
export function formatTimecode(us: Micros, fps: number): string {
  const totalFrames = usToFrame(Math.max(0, us), fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}
