/**
 * Pure edit operations. Each one mutates the project it is given, so call them
 * inside an Immer recipe (see `useEditor.edit`) to get immutability and undo.
 */
import { DEFAULT_CLIP_COLOR, NEUTRAL_ADJUST } from "./color";
import { PLATFORMS, type PlatformId } from "./platforms";
import {
  FULL_CROP,
  newId,
  type Clip,
  type CropRect,
  type Id,
  type MediaAsset,
  type MediaClip,
  type MediaFrame,
  type Project,
  type TextClip,
  type Track,
  type TrackKind,
} from "./project";
import { frameDuration, type Micros } from "./time";

export const clipEnd = (clip: Clip): Micros => clip.start + clip.duration;

export const getTrack = (project: Project, kind: TrackKind): Track | undefined =>
  project.tracks.find((t) => t.kind === kind);

export function findClip(project: Project, clipId: Id) {
  for (const track of project.tracks) {
    const index = track.clips.findIndex((c) => c.id === clipId);
    if (index !== -1) return { track, clip: track.clips[index], index };
  }
  return undefined;
}

/** The clip covering time `t` (start inclusive, end exclusive). */
export const clipAt = (track: Track, t: Micros): Clip | undefined =>
  track.clips.find((c) => t >= c.start && t < clipEnd(c));

export const trackEnd = (track: Track): Micros =>
  track.clips.reduce((end, c) => Math.max(end, clipEnd(c)), 0);

export const projectDuration = (project: Project): Micros =>
  project.tracks.reduce((end, t) => Math.max(end, trackEnd(t)), 0);

/** Lays clips end-to-end in their current order, closing gaps. Used when the main-track magnet is on. */
export function packTrack(track: Track): void {
  let t = 0;
  for (const clip of track.clips) {
    clip.start = t;
    t += clip.duration;
  }
}

/**
 * Default framing: fill the frame when the picture's shape is close to the canvas's
 * (a portrait photo in a 9:16 video), otherwise fit it so nothing is cut off.
 */
export function defaultFrame(project: Project, asset: MediaAsset): MediaFrame {
  const canvasAspect = project.canvas.width / project.canvas.height;
  const aspect = asset.width && asset.height ? asset.width / asset.height : canvasAspect;
  const ratio = aspect / canvasAspect;
  return { fit: ratio > 0.75 && ratio < 1.34 ? "fill" : "fit", x: 0.5, y: 0.5, scale: 1, rotation: 0, flipH: false };
}

/**
 * Tidies the main track after an edit. Magnet on: pack end-to-end. Magnet off: keep times,
 * but sort and push any clip that would overlap the one before it to the right.
 */
export function settleMain(project: Project, track: Track): void {
  if (project.mainMagnet) {
    packTrack(track);
    return;
  }
  track.clips.sort((a, b) => a.start - b.start);
  let end = 0;
  for (const clip of track.clips) {
    if (clip.start < end) clip.start = end;
    end = clipEnd(clip);
  }
}

/** Turns the main-track magnet on (packs clips together) or off (clips stay put). */
export function setMainMagnet(project: Project, on: boolean): void {
  project.mainMagnet = on;
  const main = getTrack(project, "main");
  if (main) settleMain(project, main);
}

/** Registers an asset and appends a clip for it: visuals to the main track, audio to the audio track. */
export function appendAsset(project: Project, asset: MediaAsset): Clip {
  project.assets[asset.id] = asset;
  const track = getTrack(project, asset.kind === "audio" ? "audio" : "main");
  if (!track) throw new Error(`Project has no ${asset.kind === "audio" ? "audio" : "main"} track`);
  const clip: Clip = {
    id: newId(),
    type: "media",
    assetId: asset.id,
    start: trackEnd(track),
    duration: asset.duration,
    sourceIn: 0,
    speed: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    transition: null,
    frame: defaultFrame(project, asset),
    crop: { ...FULL_CROP },
    color: { ...DEFAULT_CLIP_COLOR, adjust: { ...NEUTRAL_ADJUST } },
  };
  track.clips.push(clip);
  return clip;
}

/**
 * Splits a clip at timeline time `at`. Both halves must be at least one frame long.
 * Returns the id of the new right-hand clip, or null if the split isn't possible.
 */
export function splitClip(project: Project, clipId: Id, at: Micros): Id | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { track, clip, index } = found;
  const minLength = frameDuration(project.canvas.fps);
  if (at - clip.start < minLength || clipEnd(clip) - at < minLength) return null;

  const leftDuration = at - clip.start;
  const right: Clip = { ...clip, id: newId(), start: at, duration: clipEnd(clip) - at };
  if (right.type === "media" && clip.type === "media") {
    right.sourceIn = clip.sourceIn + Math.round(leftDuration * clip.speed);
    // The transition belongs to the original cut, i.e. the left half.
    right.transition = null;
  }
  clip.duration = leftDuration;
  track.clips.splice(index + 1, 0, right);
  return right.id;
}

/** Removes a clip. With the main-track magnet on, the gap closes (ripple delete). */
export function deleteClip(project: Project, clipId: Id): boolean {
  const found = findClip(project, clipId);
  if (!found) return false;
  const { track } = found;
  track.clips.splice(found.index, 1);
  if (track.kind === "main") settleMain(project, track);
  // Drop emptied extra text lanes, but always keep one.
  if (track.kind === "text" && track.clips.length === 0 && project.tracks.filter((t) => t.kind === "text").length > 1) {
    project.tracks.splice(project.tracks.indexOf(track), 1);
  }
  return true;
}

/** Shortest clip a trim can produce. */
export const MIN_CLIP_DURATION: Micros = 100_000;

const laneIsFree = (track: Track, start: Micros, end: Micros, ignoreId?: Id) =>
  !track.clips.some((c) => c.id !== ignoreId && c.start < end && clipEnd(c) > start);

const sortClips = (track: Track) => track.clips.sort((a, b) => a.start - b.start);

// JSON round-trip rather than structuredClone: clips may be Immer draft proxies.
const cloneClip = <T extends Clip>(clip: T): T => JSON.parse(JSON.stringify(clip)) as T;

/** Places a text clip on the first text lane with room for it, creating a new lane if needed. */
export function addTextClip(project: Project, clip: TextClip): void {
  let lane = project.tracks.find((t) => t.kind === "text" && laneIsFree(t, clip.start, clipEnd(clip)));
  if (!lane) {
    lane = { id: newId(), kind: "text", clips: [], muted: false, hidden: false };
    const lastText = project.tracks.findLastIndex((t) => t.kind === "text");
    const mainIndex = project.tracks.findIndex((t) => t.kind === "main");
    project.tracks.splice((lastText === -1 ? mainIndex : lastText) + 1, 0, lane);
  }
  lane.clips.push(clip);
  sortClips(lane);
}

/** Re-times a text clip, moving it to another lane if the new range overlaps its neighbours. */
export function retimeTextClip(project: Project, clipId: Id, start: Micros, duration: Micros): void {
  const found = findClip(project, clipId);
  if (found?.clip.type !== "text") return;
  if (found.track.kind !== "text") {
    // Captions stay on their own track.
    found.clip.start = Math.max(0, Math.round(start));
    found.clip.duration = Math.max(MIN_CLIP_DURATION, Math.round(duration));
    sortClips(found.track);
    return;
  }
  const copy = cloneClip(found.clip);
  deleteClip(project, clipId);
  copy.start = Math.max(0, Math.round(start));
  copy.duration = Math.max(MIN_CLIP_DURATION, Math.round(duration));
  addTextClip(project, copy);
}

/** Copies a clip to just after itself. Returns the copy's id. */
export function duplicateClip(project: Project, clipId: Id): Id | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const copy = cloneClip(found.clip);
  copy.id = newId();
  copy.start = clipEnd(found.clip);
  if (copy.type === "text" && found.track.kind === "text") {
    addTextClip(project, copy);
  } else if (found.track.kind === "main") {
    found.track.clips.splice(found.index + 1, 0, copy);
    settleMain(project, found.track);
  } else {
    found.track.clips.push(copy);
    sortClips(found.track);
  }
  return copy.id;
}

/**
 * Moves one edge of a clip to timeline time `to`. Media clips can't extend past their
 * source; free main-track clips can't grow into their neighbours; a magnetic main track re-packs.
 */
export function trimClip(project: Project, clipId: Id, edge: "start" | "end", to: Micros): void {
  const found = findClip(project, clipId);
  if (!found) return;
  const { track, clip } = found;
  const end = clipEnd(clip);
  const asset = clip.type === "media" ? project.assets[clip.assetId] : undefined;
  const bounded = clip.type === "media" && asset !== undefined && asset.kind !== "image";
  const freeMain = track.kind === "main" && !project.mainMagnet;
  const prev = freeMain ? track.clips[found.index - 1] : undefined;
  const next = freeMain ? track.clips[found.index + 1] : undefined;

  if (edge === "start") {
    let min = prev ? clipEnd(prev) : 0;
    if (bounded) min = Math.max(min, clip.start - clip.sourceIn / clip.speed);
    const start = Math.round(Math.min(Math.max(to, min), end - MIN_CLIP_DURATION));
    const delta = start - clip.start;
    clip.start = start;
    clip.duration = end - start;
    if (clip.type === "media") clip.sourceIn = Math.max(0, Math.round(clip.sourceIn + delta * clip.speed));
  } else {
    let max = next ? next.start : Number.POSITIVE_INFINITY;
    if (bounded) max = Math.min(max, clip.start + (asset.duration - clip.sourceIn) / clip.speed);
    clip.duration = Math.round(Math.min(Math.max(to, clip.start + MIN_CLIP_DURATION), max) - clip.start);
  }

  if (track.kind === "main") settleMain(project, track);
  else sortClips(track);
}

/** Moves a clip in time, stopping at its neighbours. Main-track clips move only with the magnet off. */
export function moveClip(project: Project, clipId: Id, start: Micros): void {
  const found = findClip(project, clipId);
  if (!found || (found.track.kind === "main" && project.mainMagnet)) return;
  const { track, clip } = found;
  const others = track.clips.filter((c) => c.id !== clip.id);
  const prevEnd = Math.max(0, ...others.filter((c) => clipEnd(c) <= clip.start).map(clipEnd));
  const nextStart = Math.min(
    Number.POSITIVE_INFINITY,
    ...others.filter((c) => c.start >= clipEnd(clip)).map((c) => c.start),
  );
  clip.start = Math.round(Math.min(Math.max(start, prevEnd), nextStart - clip.duration));
  sortClips(track);
}

export function setPlatform(project: Project, platform: PlatformId): void {
  const preset = PLATFORMS[platform];
  project.platform = platform;
  project.canvas.width = preset.width;
  project.canvas.height = preset.height;
}

/** Moves a main-track clip to position `index` among its siblings (used with the magnet on). */
export function reorderClip(project: Project, clipId: Id, index: number): void {
  const found = findClip(project, clipId);
  if (!found || found.track.kind !== "main") return;
  const { track, clip } = found;
  const to = Math.max(0, Math.min(track.clips.length - 1, index));
  if (to === found.index) return;
  track.clips.splice(found.index, 1);
  track.clips.splice(to, 0, clip);
  // Transitions belong to cuts. The moved clip's cut and the one it left no longer exist.
  const next = track.clips[found.index];
  if (clip.type === "media") clip.transition = null;
  if (next?.type === "media" && next !== clip) next.transition = null;
  if (track.clips[0]?.type === "media") track.clips[0].transition = null;
  settleMain(project, track);
}

/** The overlay track (picture-in-picture), created just above the main track if missing. */
export function overlayTrack(project: Project): Track {
  const existing = getTrack(project, "overlay");
  if (existing) return existing;
  const track: Track = { id: newId(), kind: "overlay", clips: [], muted: false, hidden: false };
  project.tracks.splice(project.tracks.findIndex((t) => t.kind === "main") + 1, 0, track);
  return track;
}

/** Lifts a main-track clip onto the overlay track at time `at`, shrunk so the video shows around it. */
export function moveToOverlay(project: Project, clipId: Id, at: Micros): void {
  const found = findClip(project, clipId);
  if (!found || found.track.kind !== "main" || found.clip.type !== "media") return;
  const clip = cloneClip(found.clip);
  deleteClip(project, clipId);
  clip.start = Math.max(0, Math.round(at));
  clip.transition = null;
  clip.frame = { ...clip.frame, fit: "fit", scale: 0.5, x: 0.5, y: 0.38 };
  const track = overlayTrack(project);
  track.clips.push(clip);
  sortClips(track);
}

/** Puts an overlay clip back on the main track at `at` (or the nearest cut, with the magnet on), full frame. */
export function moveToMain(project: Project, clipId: Id, at: Micros): void {
  const found = findClip(project, clipId);
  const main = getTrack(project, "main");
  if (!found || !main || found.track.kind !== "overlay" || found.clip.type !== "media") return;
  const clip = cloneClip(found.clip);
  found.track.clips.splice(found.index, 1);
  const asset = project.assets[clip.assetId];
  clip.frame = asset ? defaultFrame(project, asset) : { ...clip.frame, scale: 1, x: 0.5, y: 0.5 };
  const index = main.clips.filter((c) => c.start + c.duration / 2 < at).length;
  clip.start = Math.max(0, Math.round(at));
  main.clips.splice(index, 0, clip);
  settleMain(project, main);
}

/** The largest centred crop with pixel aspect `ratio` (w/h) inside a source of aspect `sourceAspect`. */
export function centeredCrop(sourceAspect: number, ratio: number | null): CropRect {
  if (!ratio) return { ...FULL_CROP };
  // In source-fraction units, w/h = ratio / sourceAspect.
  const rel = ratio / sourceAspect;
  const w = rel >= 1 ? 1 : rel;
  const h = rel >= 1 ? 1 / rel : 1;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

// ---------- speed & freeze frame ----------

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 8;

/** Changes playback speed; the clip keeps the same source span, so its length changes. */
export function setClipSpeed(project: Project, clipId: Id, speed: number): void {
  const found = findClip(project, clipId);
  if (found?.clip.type !== "media") return;
  const clip = found.clip;
  const next = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  const sourceSpan = clip.duration * clip.speed;
  clip.speed = next;
  clip.duration = Math.max(MIN_CLIP_DURATION, Math.round(sourceSpan / next));
  if (found.track.kind === "main") settleMain(project, found.track);
  else sortClips(found.track);
}

/**
 * Inserts a still of `clipId`'s frame (already imported as `still`) right after it, looking
 * identical (same framing, crop and colour). Later clips move over to make room.
 */
export function insertFreezeFrame(project: Project, clipId: Id, still: MediaAsset, duration: Micros): Id | null {
  const found = findClip(project, clipId);
  if (found?.clip.type !== "media") return null;
  project.assets[still.id] = still;
  const source = found.clip;
  const freeze: MediaClip = {
    ...cloneClip(source),
    id: newId(),
    assetId: still.id,
    start: clipEnd(source),
    duration,
    sourceIn: 0,
    speed: 1,
    volume: 0,
    fadeIn: 0,
    fadeOut: 0,
    transition: null,
    crop: { ...FULL_CROP },
  };
  found.track.clips.splice(found.index + 1, 0, freeze);
  // Push everything after it along, whatever the magnet setting.
  let end = clipEnd(freeze);
  for (const c of found.track.clips.slice(found.index + 2)) {
    if (c.start < end) c.start = end;
    end = clipEnd(c);
  }
  if (found.track.kind === "main") settleMain(project, found.track);
  return freeze.id;
}

// ---------- audio lanes (voiceover, music) ----------

/** Registers an audio asset and places it at `start` on the first audio lane with room. */
export function addAudioAt(project: Project, asset: MediaAsset, start: Micros): Id {
  project.assets[asset.id] = asset;
  const clip: MediaClip = {
    id: newId(),
    type: "media",
    assetId: asset.id,
    start: Math.max(0, Math.round(start)),
    duration: asset.duration,
    sourceIn: 0,
    speed: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    transition: null,
    frame: { fit: "fit", x: 0.5, y: 0.5, scale: 1, rotation: 0, flipH: false },
    crop: { ...FULL_CROP },
    color: { ...DEFAULT_CLIP_COLOR, adjust: { ...NEUTRAL_ADJUST } },
  };
  let lane = project.tracks.find((t) => t.kind === "audio" && laneIsFree(t, clip.start, clipEnd(clip)));
  if (!lane) {
    lane = { id: newId(), kind: "audio", clips: [], muted: false, hidden: false };
    project.tracks.splice(project.tracks.findLastIndex((t) => t.kind === "audio") + 1, 0, lane);
  }
  lane.clips.push(clip);
  sortClips(lane);
  return clip.id;
}

// ---------- beat markers & navigation ----------

/** Adds a beat marker (ignored if one is already within a frame). */
export function addMarker(project: Project, at: Micros): void {
  const t = Math.max(0, Math.round(at));
  const frame = frameDuration(project.canvas.fps);
  if (project.markers.some((m) => Math.abs(m - t) < frame)) return;
  project.markers.push(t);
  project.markers.sort((a, b) => a - b);
}

/** Removes the marker nearest `at` if it's within `tolerance`. */
export function removeMarkerNear(project: Project, at: Micros, tolerance: Micros): boolean {
  let best = -1;
  let bestDist = tolerance;
  project.markers.forEach((m, i) => {
    const d = Math.abs(m - at);
    if (d <= bestDist) {
      best = i;
      bestDist = d;
    }
  });
  if (best === -1) return false;
  project.markers.splice(best, 1);
  return true;
}

/** Splits main-track clips at every beat marker that falls inside one. Returns how many cuts were made. */
export function splitAtMarkers(project: Project): number {
  const main = getTrack(project, "main");
  if (!main) return 0;
  let cuts = 0;
  for (const m of project.markers) {
    const clip = clipAt(main, m);
    if (clip && m > clip.start && splitClip(project, clip.id, m)) cuts++;
  }
  return cuts;
}

/** Every place worth jumping to: 0, clip starts/ends on all tracks, and beat markers. */
export function editPoints(project: Project): Micros[] {
  const points = new Set<Micros>([0, ...project.markers]);
  for (const track of project.tracks) {
    for (const c of track.clips) {
      points.add(c.start);
      points.add(clipEnd(c));
    }
  }
  return [...points].sort((a, b) => a - b);
}

/** The next edit point after `t` (direction 1) or before it (−1); stays put at the ends. */
export function nextEditPoint(project: Project, t: Micros, direction: 1 | -1): Micros {
  const points = editPoints(project);
  const tolerance = frameDuration(project.canvas.fps) / 2;
  if (direction > 0) return points.find((p) => p > t + tolerance) ?? projectDuration(project);
  return [...points].reverse().find((p) => p < t - tolerance) ?? 0;
}
