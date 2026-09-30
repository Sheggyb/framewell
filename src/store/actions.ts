/** Editor commands shared by the toolbar, panels and keyboard shortcuts. */
import type { Draft } from "immer";
import { getFrame, importFile, MediaImportError, prepareAudio } from "@/engine/media/registry";
import {
  addAudioAt,
  addMarker,
  addTextClip,
  appendAsset,
  copyClips,
  deleteClips,
  pasteClips,
  placeAsset,
  trimToTime,
  type ClipboardItem,
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
import { newId, type Id, type Project, type TextClip } from "@/engine/model/project";
import { templateClips, type TextTemplate } from "@/engine/model/templates";
import { settleTemplateLayout } from "@/engine/render/templateLayout";
import { ensureFontsLoaded, fontFamilyFor } from "@/lib/fonts";
import { createTextClip } from "@/engine/model/text";
import { frameDuration, secondsToUs, snapToFrame, type Micros } from "@/engine/model/time";
import { saveMedia } from "@/lib/storage";
import { label, t, templateTexts, useI18n } from "@/i18n";
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
  edit(t("editor.undo.split"), (draft) => {
    rightId = splitClip(draft, target.id, playhead);
  });
  if (rightId) {
    select(rightId);
    useEditor.getState().showToast(t("editor.toasts.split"));
  }
}

/** Every selected clip: the primary one first, then any others (multi-selection). */
export function selectedIds(): Id[] {
  const { selectedClipId, multi } = useEditor.getState();
  return selectedClipId ? [selectedClipId, ...multi] : [];
}

export function deleteSelected(): void {
  const { edit, select } = useEditor.getState();
  const ids = selectedIds();
  if (ids.length === 0) return;
  if (ids.length === 1) {
    edit(t("editor.undo.delete"), (draft) => {
      deleteClip(draft, ids[0]);
    });
  } else {
    edit(t("editor.many.undo.deleteMany", { count: ids.length }), (draft) => void deleteClips(draft, ids));
  }
  select(null);
  useEditor
    .getState()
    .showToast(ids.length === 1 ? t("editor.toasts.deleted") : t("editor.many.toasts.deletedMany", { count: ids.length }), { undo: true });
}

/** Copied clips (Ctrl+C / the right-click menu). Lives for the session, so it can be pasted into another project. */
let clipboard: ClipboardItem[] = [];

export function copySelection(): void {
  const ids = selectedIds();
  if (ids.length === 0) return;
  clipboard = copyClips(useEditor.getState().project, ids);
  useEditor.getState().showToast(t("editor.many.toasts.copiedMany", { count: clipboard.length }));
}

export function cutSelection(): void {
  const ids = selectedIds();
  if (ids.length === 0) return;
  const s = useEditor.getState();
  clipboard = copyClips(s.project, ids);
  s.edit(t("editor.many.undo.cut"), (draft) => void deleteClips(draft, ids));
  s.select(null);
  s.showToast(t("editor.many.toasts.cutMany", { count: clipboard.length }), { undo: true });
}

/** Pastes the copied clips at the playhead and selects them. */
export function pasteClipboard(): void {
  const s = useEditor.getState();
  if (clipboard.length === 0) return s.showToast(t("editor.many.toasts.nothingToPaste"));
  s.pause();
  let ids: Id[] = [];
  s.edit(t("editor.many.undo.paste"), (draft) => {
    ids = pasteClips(draft, clipboard, s.playhead);
  });
  if (ids.length) {
    s.selectMany(ids);
    s.showToast(t("editor.many.toasts.pasted", { count: ids.length }), { undo: true });
  }
}

/**
 * Q / W: cuts away the part of a clip before or after the playhead. Works on the selected clip
 * when the playhead is inside it, else on the main-track clip under the playhead.
 */
export function trimAtPlayhead(edge: "start" | "end"): void {
  const s = useEditor.getState();
  const inside = (id: Id | null) => {
    const clip = id ? findClip(s.project, id)?.clip : undefined;
    return clip && s.playhead > clip.start && s.playhead < clipEnd(clip) ? clip : undefined;
  };
  const main = getTrack(s.project, "main");
  const target = inside(s.selectedClipId) ?? (main ? clipAt(main, s.playhead) : undefined);
  if (!target || !inside(target.id)) return s.showToast(t("editor.studio.nothingToTrim"));
  s.pause();
  s.edit(t("editor.undo.trimClip"), (draft) => void trimToTime(draft, target.id, edge, s.playhead));
  s.select(target.id);
}

/** Selects every clip in the project (Ctrl+A). */
export function selectAll(): void {
  const s = useEditor.getState();
  s.selectMany(s.project.tracks.flatMap((track) => track.clips.map((c) => c.id)));
}

/** Asks before deleting the selected clip (the delete button, ✕ handle and Delete key all use this). */
export function requestDeleteSelected(): void {
  const { selectedClipId, project, ask, draftText, resolveDraftText, multi } = useEditor.getState();
  if (multi.length > 0) {
    const count = multi.length + 1;
    return ask({
      title: t("editor.many.confirmDelete", { count }),
      message: t("editor.confirm.delete.message"),
      confirmLabel: t("common.delete"),
      onConfirm: deleteSelected,
    });
  }
  const clip = selectedClipId ? findClip(project, selectedClipId)?.clip : undefined;
  if (!clip) return;
  // A text that was never added has nothing to confirm: deleting it just cancels it.
  if (draftText?.clipId === clip.id) return resolveDraftText(false);
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
    title: t(`editor.confirm.delete.${what}`),
    message: t("editor.confirm.delete.message"),
    confirmLabel: t("common.delete"),
    onConfirm: deleteSelected,
  });
}

export function duplicateSelected(): void {
  const { selectedClipId, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  let copyId: Id | null = null;
  edit(t("editor.undo.duplicate"), (draft) => {
    copyId = duplicateClip(draft, selectedClipId);
  });
  if (copyId) {
    select(copyId);
    useEditor.getState().showToast(t("editor.toasts.copied"));
  }
}

/** Lifts the selected main clip onto the overlay track (picture-in-picture) at the playhead. */
export function toOverlay(): void {
  const { selectedClipId, playhead, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  edit(t("editor.undo.makeOverlay"), (draft) => moveToOverlay(draft, selectedClipId, playhead));
  select(selectedClipId);
}

/** Puts the selected overlay back on the main track, at the cut nearest the playhead. */
export function toMain(): void {
  const { selectedClipId, playhead, edit, select } = useEditor.getState();
  if (!selectedClipId) return;
  edit(t("editor.undo.moveToMain"), (draft) => moveToMain(draft, selectedClipId, playhead));
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
  updateProject(t("editor.undo.nudge"), (d) => moveClip(d, clip.id, to));
}

// ---------- beat markers ----------

export function addBeatAtPlayhead(): void {
  const { playhead, edit, project } = useEditor.getState();
  const before = project.markers.length;
  edit(t("editor.undo.beatMarker"), (d) => addMarker(d, playhead));
  if (useEditor.getState().project.markers.length > before) useEditor.getState().showToast(t("editor.toasts.beatAdded"));
}

export function splitAtBeats(): void {
  let cuts = 0;
  useEditor.getState().edit(t("editor.undo.cutAtBeats"), (d) => {
    cuts = splitAtMarkers(d);
  });
  useEditor.getState().showToast(cuts ? t("editor.toasts.cutsMade", { count: cuts }) : t("editor.toasts.noClipsUnderBeats"));
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
    s.showToast(t("editor.toasts.freezeNeedsVideo"));
    return;
  }
  if (s.playhead - clip.start < frameDuration(s.project.canvas.fps)) {
    s.showToast(t("editor.toasts.freezeNeedsInside"));
    return;
  }
  const sourceSeconds = (clip.sourceIn + (s.playhead - clip.start) * clip.speed) / 1_000_000;
  const frame = await getFrame(clip.assetId, sourceSeconds);
  if (!frame) return;
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  canvas.getContext("2d")?.drawImage(frame, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const still = await importGenerated(new File([blob], `${t("editor.freezeFrameName")}.png`, { type: "image/png" }));

  let freezeId: Id | null = null;
  s.edit(t("editor.undo.freezeFrame"), (d) => {
    // Split here (a no-op at the clip's very edges), then hold the frame after the left part.
    splitClip(d, clip.id, s.playhead);
    freezeId = insertFreezeFrame(d, clip.id, still, FREEZE_DURATION);
  });
  if (freezeId) {
    useEditor.getState().select(freezeId);
    useEditor.getState().showToast(t("editor.toasts.freezeAdded"));
  }
}

/** Adds a recorded voiceover at `start` on its own audio lane. */
export async function addVoiceover(file: File, start: number): Promise<void> {
  const asset = await importGenerated(file);
  void prepareAudio(asset.id);
  let clipId: Id | null = null;
  useEditor.getState().edit(t("editor.undo.voiceover"), (d) => {
    clipId = addAudioAt(d, asset, start);
  });
  if (clipId) useEditor.getState().select(clipId);
  useEditor.getState().showToast(t("editor.toasts.voiceoverAdded"));
}

/**
 * Puts a draft text at the playhead and opens the text editor (without the keyboard: that waits
 * for a tap on the text box). It only becomes part of the project once confirmed with Add;
 * Cancel removes it and everything done to it.
 */
export function addText(presetId?: string): void {
  const s = useEditor.getState();
  s.pause();
  const clip = createTextClip(s.playhead, undefined, presetId);
  clip.text = t("text.edit.defaultText");
  s.select(null);
  s.edit(t("editor.undo.addText"), (draft) => {
    addTextClip(draft, clip);
  });
  s.beginDraftText(clip.id);
  s.select(clip.id);
  s.openPanel("edit");
}

/** Keeps the draft text (one "Add text" step) and closes its tools. */
export function confirmDraftText(): void {
  const s = useEditor.getState();
  s.resolveDraftText(true);
  s.select(null);
  s.showToast(t("editor.toasts.textAdded"), { undo: true });
}

/**
 * A template's text clips as they would look once added at `at`: the real fonts loaded and the
 * layers measured, so lines that wrap never end up on top of each other. Shared by the add flow
 * and by the Templates panel, which shows a template before the user commits to it.
 */
/** Laid-out templates (at time 0), so browsing doesn't re-measure every frame of playback. */
const settledTemplates = new Map<string, TextClip[]>();

export async function templateClipsAt(
  template: TextTemplate,
  at: Micros,
  canvas: { width: number; height: number; fps: number },
  lookPreset: string | null,
): Promise<TextClip[]> {
  // The words are in the app's language, so the layout (which depends on them) is cached per language.
  const texts = templateTexts(template.id);
  const key = `${template.id}|${lookPreset}|${useI18n.getState().locale}|${canvas.width}x${canvas.height}@${canvas.fps}`;
  let settled = settledTemplates.get(key);
  if (!settled) {
    settled = templateClips(template, 0, canvas.fps, lookPreset, texts);
    await ensureFontsLoaded(settled.map((c) => c.style));
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) settleTemplateLayout(ctx, settled, canvas.width, canvas.height, fontFamilyFor);
    if (settledTemplates.size > 40) settledTemplates.clear();
    settledTemplates.set(key, settled);
  }
  const start = snapToFrame(at, canvas.fps);
  return settled.map((c) => ({ ...structuredClone(c), id: newId(), start: c.start + start }));
}

/** An add in progress (fonts loading): a second tap mustn't add the template twice. */
let addingTemplate = false;

/**
 * Drops a text template at the playhead, plays it once so you see it animate, and selects its
 * first text so it can be changed straight away.
 */
export async function addTemplate(template: TextTemplate, lookPreset: string | null): Promise<void> {
  if (addingTemplate) return;
  addingTemplate = true;
  useEditor.getState().pause();
  const { project, playhead: start } = useEditor.getState();
  let clips: TextClip[];
  try {
    clips = await templateClipsAt(template, start, project.canvas, lookPreset);
  } finally {
    addingTemplate = false;
  }
  const s = useEditor.getState();
  s.edit(t("editor.undo.template", { name: label("templateName", template.id, template.name) }), (draft) => {
    for (const clip of clips) addTextClip(draft, clip);
  });
  s.openPanel(null);
  if (clips[0]) s.select(clips[0].id);
  s.play(start, start + secondsToUs(template.duration), start);
  s.showToast(t("editor.toasts.templateAdded"));
}

/**
 * Puts an imported file (from the media library) on the timeline, at the playhead or where it was
 * dropped, and selects it.
 */
export function addAssetToTimeline(assetId: Id, at?: Micros, prefer?: "main" | "overlay"): void {
  const s = useEditor.getState();
  const asset = s.project.assets[assetId];
  if (!asset) return;
  s.pause();
  let id: Id | null = null;
  s.edit(t("editor.studio.undo.addClip", { name: asset.name }), (draft) => {
    id = placeAsset(draft, assetId, at ?? s.playhead, prefer);
  });
  if (id) s.select(id);
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
  s.edit(t("editor.undo.addSticker"), (draft) => {
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
  if (part === "in") s.play(clip.start, Math.min(end, clip.start + clip.animation.inDuration + PREVIEW_TAIL), back, true);
  else if (part === "out") s.play(Math.max(clip.start, end - clip.animation.outDuration - PREVIEW_TAIL), end, back, true);
  else s.play(clip.start, end, back, true);
}

/** Imports files in order and saves them on-device. Returns user-facing error messages. */
/** Where imported files go: appended at the end (default), or placed from `at` (dropped on a track). */
export interface ImportPlacement {
  at: Micros;
  prefer: "main" | "overlay";
}

export async function importFiles(
  files: Iterable<File>,
  onProgress?: (done: number, total: number) => void,
  placement?: ImportPlacement,
): Promise<string[]> {
  const errors: string[] = [];
  const saves: Promise<unknown>[] = [];
  const list = [...files];
  // Several files dropped at once go one after another from the drop point.
  let cursor = placement?.at ?? 0;
  for (const [i, file] of list.entries()) {
    onProgress?.(i, list.length);
    try {
      const asset = await importFile(file);
      // Put the clip on the timeline straight away, so it can be played and edited while the
      // file is still being copied to storage (large phone videos take a few seconds).
      useEditor.getState().edit(t("editor.undo.import", { name: file.name }), (draft) => {
        if (!placement) return void appendAsset(draft, asset);
        draft.assets[asset.id] = asset;
        placeAsset(draft, asset.id, cursor, placement.prefer);
      });
      cursor += asset.duration;
      // Decode the sound in the background so playback and export have it ready.
      if (asset.hasAudio) void prepareAudio(asset.id);
      // Keep a copy on-device so the project reopens later. Failure (e.g. quota) isn't fatal.
      saves.push(
        saveMedia(useEditor.getState().project.id, asset.id, file).catch(() =>
          errors.push(t("errors.import.notSaved", { name: file.name })),
        ),
      );
    } catch (err) {
      errors.push(
        err instanceof MediaImportError
          ? t(`errors.import.${err.code}`, err.params)
          : t("errors.import.failed", { name: file.name }),
      );
    }
  }
  await Promise.all(saves);
  return errors;
}
