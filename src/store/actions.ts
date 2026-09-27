/** Editor commands shared by the toolbar, panels and keyboard shortcuts. */
import type { Draft } from "immer";
import { getFrame, importFile, MediaImportError, prepareAudio } from "@/engine/media/registry";
import {
  addAudioAt,
  addMarker,
  addTextClip,
  appendAsset,
  clipAt,
  clipEnd,
  deleteClip,
  duplicateClip,
  findClip,
  getTrack,
  insertFreezeFrame,
  moveClip,
  moveToMain,
  moveToOverlay,
  nextEditPoint,
  projectDuration,
  splitAtMarkers,
  splitClip,
} from "@/engine/model/ops";
import type { Id, Project, TextClip } from "@/engine/model/project";
import { templateClips, type TextTemplate } from "@/engine/model/templates";
import { settleTemplateLayout } from "@/engine/render/templateLayout";
import { ensureFontsLoaded, fontFamilyFor } from "@/lib/fonts";
import { createTextClip } from "@/engine/model/text";
import { frameDuration, secondsToUs } from "@/engine/model/time";
import { saveMedia } from "@/lib/storage";
import { useEditor } from "./editor";

/** Splits the selected clip at the playhead, or the main-track clip under it if nothing is selected. */
export function splitAtPlayhead(): void {
  const { project, playhead, selectedClipId, edit, select } = useEditor.getState();
  const selected = selectedClipId ? findClip(project, selectedClipId)?.clip : undefined;
  const covers = selected && playhead > selected.start && playhead < clipEnd(selected);
  const main = getTrack(project, "main");
  const target = covers ? selected : main && clipAt(main, playhead);
  if (!target) return;

  let rightId: string | null = null;
  edit("Split", (draft) => {
    rightId = splitClip(draft, target.id, playhead);
  });
  if (rightId) {
    select(rightId);
    useEditor.getState().showToast("Split");
  }
}

export function deleteSelected(): void {
  const { selectedClipId, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  edit("Delete", (draft) => {
    deleteClip(draft, selectedClipId);
  });
  select(null);
  useEditor.getState().showToast("Deleted", { undo: true });
}

/** Asks before deleting the selected clip (the delete button, ✕ handle and Delete key all use this). */
export function requestDeleteSelected(): void {
  const { selectedClipId, project, ask } = useEditor.getState();
  const clip = selectedClipId ? findClip(project, selectedClipId)?.clip : undefined;
  if (!clip) return;
  const what =
    clip.type === "text"
      ? /^\p{Extended_Pictographic}/u.test(clip.text)
        ? "sticker"
        : "text"
      : project.assets[clip.assetId]?.kind === "audio"
        ? "sound"
        : project.assets[clip.assetId]?.kind === "image"
          ? "photo"
          : "clip";
  ask({
    title: `Delete this ${what}?`,
    message: "You can bring it back with Undo.",
    confirmLabel: "Delete",
    onConfirm: deleteSelected,
  });
}

export function duplicateSelected(): void {
  const { selectedClipId, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  let copyId: Id | null = null;
  edit("Duplicate", (draft) => {
    copyId = duplicateClip(draft, selectedClipId);
  });
  if (copyId) {
    select(copyId);
    useEditor.getState().showToast("Copied");
  }
}

/** Lifts the selected main clip onto the overlay track (picture-in-picture) at the playhead. */
export function toOverlay(): void {
  const { selectedClipId, playhead, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  edit("Make overlay", (draft) => moveToOverlay(draft, selectedClipId, playhead));
  select(selectedClipId);
}

/** Puts the selected overlay back on the main track, at the cut nearest the playhead. */
export function toMain(): void {
  const { selectedClipId, playhead, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  edit("Move to main track", (draft) => moveToMain(draft, selectedClipId, playhead));
  select(selectedClipId);
}

export function stepFrames(frames: number): void {
  const { project, playhead, setPlayhead, pause } = useEditor.getState();
  pause();
  setPlayhead(playhead + frames * frameDuration(project.canvas.fps));
}

export function stepSeconds(seconds: number): void {
  const { playhead, setPlayhead, pause } = useEditor.getState();
  pause();
  setPlayhead(playhead + secondsToUs(seconds));
}

/** Jumps to the previous/next cut, clip edge or beat marker. */
export function jumpToEditPoint(direction: 1 | -1): void {
  const { project, playhead, setPlayhead, pause } = useEditor.getState();
  pause();
  setPlayhead(nextEditPoint(project, playhead, direction));
}

export function jumpTo(where: "start" | "end"): void {
  const { project, setPlayhead, pause } = useEditor.getState();
  pause();
  setPlayhead(where === "start" ? 0 : projectDuration(project));
}

/** Moves the selected clip by whole frames (desktop fine-tuning with , and .). */
export function nudgeSelected(frames: number): void {
  const { project, selectedClipId } = useEditor.getState();
  const clip = selectedClipId ? findClip(project, selectedClipId)?.clip : undefined;
  if (!clip) return;
  const to = clip.start + frames * frameDuration(project.canvas.fps);
  updateProject("Nudge", (d) => moveClip(d, clip.id, to));
}

// ---------- beat markers ----------

export function addBeatAtPlayhead(): void {
  const { playhead, edit, project } = useEditor.getState();
  const before = project.markers.length;
  edit("Beat marker", (d) => addMarker(d, playhead));
  if (useEditor.getState().project.markers.length > before) useEditor.getState().showToast("Beat marker added");
}

export function splitAtBeats(): void {
  let cuts = 0;
  useEditor.getState().edit("Cut at beats", (d) => {
    cuts = splitAtMarkers(d);
  });
  useEditor.getState().showToast(cuts ? `${cuts} cut${cuts === 1 ? "" : "s"} made` : "No clips under the beat markers");
}

// ---------- generated media (freeze frames, voiceover) ----------

/** Imports a file made in the app (not picked by the user) and saves it with the project. */
async function importGenerated(file: File) {
  const asset = await importFile(file);
  await saveMedia(useEditor.getState().project.id, asset.id, file).catch(() => {});
  return asset;
}

const FREEZE_DURATION = secondsToUs(1.5);

/** Holds the video's current frame for 1.5 s: splits the clip here and inserts a still. */
export async function freezeFrameAtPlayhead(): Promise<void> {
  const s = useEditor.getState();
  s.pause();
  const main = getTrack(s.project, "main");
  const clip = main && clipAt(main, s.playhead);
  if (clip?.type !== "media" || s.project.assets[clip.assetId]?.kind !== "video") {
    s.showToast("Move the playhead over a video clip first");
    return;
  }
  if (s.playhead - clip.start < frameDuration(s.project.canvas.fps)) {
    s.showToast("Move the playhead a little into the clip");
    return;
  }
  const sourceSeconds = (clip.sourceIn + (s.playhead - clip.start) * clip.speed) / 1_000_000;
  const frame = await getFrame(clip.assetId, sourceSeconds);
  if (!frame) return;
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  canvas.getContext("2d")?.drawImage(frame, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const still = await importGenerated(new File([blob], "Freeze frame.png", { type: "image/png" }));

  let freezeId: Id | null = null;
  s.edit("Freeze frame", (d) => {
    // Split here (a no-op at the clip's very edges), then hold the frame after the left part.
    splitClip(d, clip.id, s.playhead);
    freezeId = insertFreezeFrame(d, clip.id, still, FREEZE_DURATION);
  });
  if (freezeId) {
    useEditor.getState().select(freezeId);
    useEditor.getState().showToast("Freeze frame added");
  }
}

/** Adds a recorded voiceover at `start` on its own audio lane. */
export async function addVoiceover(file: File, start: number): Promise<void> {
  const asset = await importGenerated(file);
  void prepareAudio(asset.id);
  let clipId: Id | null = null;
  useEditor.getState().edit("Voiceover", (d) => {
    clipId = addAudioAt(d, asset, start);
  });
  if (clipId) useEditor.getState().select(clipId);
  useEditor.getState().showToast("Voiceover added");
}

/** Adds a text clip at the playhead, selects it and opens the text editor. */
export function addText(presetId?: string): void {
  const s = useEditor.getState();
  s.pause();
  const clip = createTextClip(s.playhead, undefined, presetId);
  s.edit("Add text", (draft) => {
    addTextClip(draft, clip);
  });
  s.select(clip.id);
  s.openPanel("edit");
}

/**
 * Drops a text template at the playhead, plays it once so you see it animate, and selects its
 * first text so it can be changed straight away.
 */
export async function addTemplate(template: TextTemplate, lookPreset: string | null): Promise<void> {
  useEditor.getState().pause();
  const { project, playhead: start } = useEditor.getState();
  const { width, height, fps } = project.canvas;
  const clips = templateClips(template, start, fps, lookPreset);
  // Measure with the real fonts so lines that wrap never end up on top of each other.
  await ensureFontsLoaded(clips.map((c) => c.style));
  const ctx = document.createElement("canvas").getContext("2d");
  if (ctx) settleTemplateLayout(ctx, clips, width, height, fontFamilyFor);
  const s = useEditor.getState();
  s.edit(`Template: ${template.name}`, (draft) => {
    for (const clip of clips) addTextClip(draft, clip);
  });
  s.openPanel(null);
  if (clips[0]) s.select(clips[0].id);
  s.play(start, start + secondsToUs(template.duration), start);
  s.showToast("Template added. Tap any text to change it");
}

/** Adds an emoji or label sticker (a text clip) at the playhead and selects it. */
export function addSticker(text: string, presetId: string): void {
  const s = useEditor.getState();
  s.pause();
  const clip = createTextClip(s.playhead, undefined, presetId);
  clip.text = text;
  // Stagger so several stickers added in a row don't sit exactly on top of each other.
  const n = s.project.tracks.filter((t) => t.kind === "text").reduce((k, t) => k + t.clips.length, 0);
  clip.transform.x = 0.5 + ((n % 3) - 1) * 0.12;
  clip.transform.y = 0.38 + (n % 2) * 0.08;
  s.edit("Add sticker", (draft) => {
    addTextClip(draft, clip);
  });
  s.openPanel(null);
  s.select(clip.id);
}

let commitTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Changes a text clip. Continuous controls (sliders, typing) pass `commit: "later"` so a burst
 * of changes becomes one undo step; taps pass `"now"`; drags pass `"manual"` and call
 * `commitLive()` on release. Recipes must set absolute values.
 */
export function updateText(
  clipId: Id,
  label: string,
  recipe: (clip: Draft<TextClip>) => void,
  commit: Commit = "later",
): void {
  updateProject(
    label,
    (draft) => {
      const clip = findClip(draft, clipId)?.clip;
      if (clip?.type === "text") recipe(clip);
    },
    commit,
  );
}

type Commit = "now" | "later" | "manual";

/** Project-level version of `updateText`, for changes that touch more than one clip or lane. */
export function updateProject(label: string, recipe: (draft: Draft<Project>) => void, commit: Commit = "later"): void {
  const s = useEditor.getState();
  s.live(label, recipe);
  clearTimeout(commitTimer);
  if (commit === "now") s.commitLive();
  else if (commit === "later") commitTimer = setTimeout(() => useEditor.getState().commitLive(), 700);
}

const PREVIEW_TAIL = secondsToUs(0.6);

/** Plays just the part of a text clip where an animation happens. */
export function previewAnimation(clipId: Id, part: "in" | "out" | "loop"): void {
  const s = useEditor.getState();
  const clip = findClip(s.project, clipId)?.clip;
  if (clip?.type !== "text") return;
  const end = clipEnd(clip);
  // Come back to where the user was (or the clip start) so the text stays on screen.
  const back = s.playhead >= clip.start && s.playhead < end ? s.playhead : clip.start;
  if (part === "in") s.play(clip.start, Math.min(end, clip.start + clip.animation.inDuration + PREVIEW_TAIL), back);
  else if (part === "out") s.play(Math.max(clip.start, end - clip.animation.outDuration - PREVIEW_TAIL), end, back);
  else s.play(clip.start, end, back);
}

/** Imports files in order and saves them on-device. Returns user-facing error messages. */
export async function importFiles(
  files: Iterable<File>,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const errors: string[] = [];
  const saves: Promise<unknown>[] = [];
  const list = [...files];
  for (const [i, file] of list.entries()) {
    onProgress?.(i, list.length);
    try {
      const asset = await importFile(file);
      // Put the clip on the timeline straight away, so it can be played and edited while the
      // file is still being copied to storage (large phone videos take a few seconds).
      useEditor.getState().edit(`Import ${file.name}`, (draft) => {
        appendAsset(draft, asset);
      });
      // Decode the sound in the background so playback and export have it ready.
      if (asset.hasAudio) void prepareAudio(asset.id);
      // Keep a copy on-device so the project reopens later. Failure (e.g. quota) isn't fatal.
      saves.push(
        saveMedia(useEditor.getState().project.id, asset.id, file).catch(() =>
          errors.push(`"${file.name}" is in your project but couldn't be saved on this device (storage full?).`),
        ),
      );
    } catch (err) {
      errors.push(err instanceof MediaImportError ? err.message : `Couldn't import "${file.name}".`);
    }
  }
  await Promise.all(saves);
  return errors;
}
