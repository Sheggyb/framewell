/**
 * Draws one output frame of the project. Shared by preview and export so what you see is
 * what you export. Layers, bottom to top: main track (with transitions), then the other
 * tracks in project order (overlays, text, captions).
 */
import { clipAt, clipEnd, findClip, getTrack, projectDuration } from "../model/ops";
import type { Id, MediaClip, Project, TextClip } from "../model/project";
import { STATIC_TEXT_STATE, textAnimState } from "../model/textAnimation";
import { clampUs, usToFrame, usToSeconds, type Micros } from "../model/time";
import { drawCropStage, drawMedia, type DrawableFrame } from "./media";
import { drawText, layoutText, type Ctx2D, type FontResolver } from "./text";
import { drawTransition, transitionAt } from "./transitions";

export type { DrawableFrame } from "./media";

export type FrameProvider = (clip: MediaClip, sourceSeconds: number) => Promise<DrawableFrame | null>;

export interface ComposeOptions {
  fonts: FontResolver;
  /** Draw this text clip without animation (while it's being edited). */
  staticClipId?: Id | null;
  /** Show only this media clip's full, uncropped source (the crop editor). */
  cropEditClipId?: Id | null;
}

/** At the very end of the timeline, keep showing the last frame instead of black. */
export const frameTime = (project: Project, t: Micros): Micros =>
  Math.min(t, Math.max(0, projectDuration(project) - 1));

/** Text clips visible at `t`, bottom-most first. */
export function visibleTextClips(project: Project, t: Micros): TextClip[] {
  const probe = frameTime(project, t);
  const out: TextClip[] = [];
  for (const track of project.tracks) {
    if ((track.kind !== "text" && track.kind !== "caption") || track.hidden) continue;
    const clip = clipAt(track, probe);
    if (clip?.type === "text") out.push(clip);
  }
  return out;
}

/** Overlay (picture-in-picture) clips visible at `t`, bottom-most first. */
export function visibleOverlayClips(project: Project, t: Micros): MediaClip[] {
  const probe = frameTime(project, t);
  const out: MediaClip[] = [];
  for (const track of project.tracks) {
    if (track.kind !== "overlay" || track.hidden) continue;
    const clip = clipAt(track, probe);
    if (clip?.type === "media") out.push(clip);
  }
  return out;
}

const sourceSeconds = (c: MediaClip, at: Micros) => usToSeconds(c.sourceIn + (at - c.start) * c.speed);

export async function composeFrame(
  ctx: Ctx2D,
  project: Project,
  t: Micros,
  frames: FrameProvider,
  options: ComposeOptions,
): Promise<void> {
  const { width, height } = project.canvas;
  const probe = frameTime(project, t);

  if (options.cropEditClipId) {
    const found = findClip(project, options.cropEditClipId);
    if (found?.clip.type === "media") {
      const clip = found.clip;
      const at = clampUs(probe, clip.start, clipEnd(clip) - 1);
      const frame = await frames(clip, sourceSeconds(clip, at));
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawCropStage(ctx, frame, project.assets[clip.assetId], width, height);
      return;
    }
  }

  const main = getTrack(project, "main");
  const clip = main && !main.hidden ? clipAt(main, probe) : undefined;
  const transition = main && !main.hidden ? transitionAt(main, probe) : null;

  // Fetch every (async) frame first, then draw in one synchronous pass so a half-drawn
  // canvas is never shown. Sequential awaits: one sink must not serve two requests at once.
  const fromFrame = transition ? await frames(transition.from, sourceSeconds(transition.from, transition.fromTime)) : null;
  const toFrame = transition ? await frames(transition.to, sourceSeconds(transition.to, transition.toTime)) : null;
  const mainFrame = !transition && clip?.type === "media" ? await frames(clip, sourceSeconds(clip, probe)) : null;
  const overlays: [MediaClip, DrawableFrame | null][] = [];
  for (const overlay of visibleOverlayClips(project, probe)) {
    overlays.push([overlay, await frames(overlay, sourceSeconds(overlay, probe))]);
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  const seed = usToFrame(probe, project.canvas.fps);

  if (transition) {
    drawTransition(
      ctx,
      transition.type,
      transition.progress,
      width,
      height,
      () => drawMedia(ctx, fromFrame, transition.from, width, height, { seed, t: transition.fromTime, backdrop: true }),
      () => drawMedia(ctx, toFrame, transition.to, width, height, { seed, t: transition.toTime, backdrop: true }),
    );
  } else if (clip?.type === "media") {
    drawMedia(ctx, mainFrame, clip, width, height, { seed, t: probe, backdrop: true });
  }

  for (const [overlay, frame] of overlays) drawMedia(ctx, frame, overlay, width, height, { seed, t: probe });

  for (const text of visibleTextClips(project, probe)) {
    const anim = text.id === options.staticClipId ? STATIC_TEXT_STATE : textAnimState(text, probe - text.start);
    const layout = layoutText(ctx, text, width, options.fonts);
    drawText(ctx, text, layout, anim, width, height, options.fonts);
  }
}
