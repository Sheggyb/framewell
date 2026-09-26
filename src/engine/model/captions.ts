/**
 * Manual captions: a script split into lines, timed by tapping along or spread evenly,
 * stored as text clips on the caption track. SRT import/export for other tools.
 */
import { clipEnd, getTrack } from "./ops";
import { newId, type Project, type TextClip, type Track } from "./project";
import { applyPreset, createTextClip, presetById } from "./text";
import { secondsToUs, type Micros } from "./time";

export interface CaptionCue {
  start: Micros;
  end: Micros;
  text: string;
}

/** Captions sit at the bottom, above the platform UI safe zone. */
export const CAPTION_Y = 0.68;
const MIN_CUE: Micros = secondsToUs(0.4);

export const splitScript = (script: string): string[] =>
  script
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** The caption track, created above the text lanes (so captions draw on top) if missing. */
export function captionTrack(project: Project): Track {
  const existing = getTrack(project, "caption");
  if (existing) return existing;
  const track: Track = { id: newId(), kind: "caption", clips: [], muted: false, hidden: false };
  const lastText = project.tracks.findLastIndex((t) => t.kind === "text");
  const main = project.tracks.findIndex((t) => t.kind === "main");
  project.tracks.splice((lastText === -1 ? main : lastText) + 1, 0, track);
  return track;
}

export const captionClips = (project: Project): TextClip[] =>
  (getTrack(project, "caption")?.clips ?? []).filter((c): c is TextClip => c.type === "text");

/** Spreads lines over [start, end], giving longer lines proportionally more time. */
export function timeEvenly(lines: string[], start: Micros, end: Micros): CaptionCue[] {
  const weights = lines.map((l) => Math.max(1, l.split(/\s+/).length));
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(end - start, MIN_CUE * lines.length);
  let t = start;
  return lines.map((text, i) => {
    const duration = Math.round((span * weights[i]) / total);
    const cue = { start: t, end: t + duration, text };
    t += duration;
    return cue;
  });
}

/** Replaces all captions with `cues`, styled with the caption preset. */
export function setCaptions(project: Project, cues: CaptionCue[], presetId: string): void {
  const track = captionTrack(project);
  const preset = presetById(presetId);
  track.clips = cues
    .filter((c) => c.text.trim() && c.end > c.start)
    .sort((a, b) => a.start - b.start)
    .map((cue, i, all) => {
      // Never overlap the next cue.
      const end = Math.min(cue.end, all[i + 1]?.start ?? Number.POSITIVE_INFINITY);
      const clip = createTextClip(cue.start, Math.max(MIN_CUE / 4, end - cue.start), preset.id);
      clip.text = cue.text.trim();
      clip.transform.y = CAPTION_Y;
      return clip;
    });
}

export function styleCaptions(project: Project, presetId: string): void {
  const preset = presetById(presetId);
  for (const clip of captionClips(project)) applyPreset(clip, preset);
}

export function moveCaptions(project: Project, y: number): void {
  for (const clip of captionClips(project)) clip.transform.y = y;
}

export function highlightCaptions(project: Project, color: string | null): void {
  for (const clip of captionClips(project)) clip.animation.highlight = color;
}

// ---------- SRT ----------

function srtTime(us: Micros): string {
  const ms = Math.max(0, Math.round(us / 1000));
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

export function formatSrt(cues: CaptionCue[]): string {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
}

const TIME = /(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/;

function parseTime(s: string): Micros | null {
  const m = TIME.exec(s);
  if (!m) return null;
  const [h, min, sec, ms] = m.slice(1).map(Number);
  return secondsToUs(h * 3600 + min * 60 + sec + ms / 10 ** m[4].length);
}

/** Parses SRT (and WebVTT-style timestamps). Unparseable blocks are skipped. */
export function parseSrt(text: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    const timeLine = lines.findIndex((l) => l.includes("-->"));
    if (timeLine === -1) continue;
    const [a, b] = lines[timeLine].split("-->");
    const start = parseTime(a);
    const end = parseTime(b);
    const body = lines
      .slice(timeLine + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (start === null || end === null || !body) continue;
    cues.push({ start, end, text: body });
  }
  return cues;
}

export const cuesFromProject = (project: Project): CaptionCue[] =>
  captionClips(project).map((c) => ({ start: c.start, end: clipEnd(c), text: c.text }));
