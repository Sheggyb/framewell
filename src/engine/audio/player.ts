/**
 * Live audio playback for the editor preview. Browsers (iOS especially) only let an
 * AudioContext start from a user gesture, so `installAudioUnlock` resumes it on the first tap.
 */
import { decodedAudio } from "../media/registry";
import type { Project } from "../model/project";
import type { Micros } from "../model/time";
import { planAudio, scheduleAudio } from "./plan";

let ctx: AudioContext | null = null;
let nodes: AudioScheduledSourceNode[] = [];
let startedAt = 0;
let previewMuted = false;

/** Silences preview playback (e.g. while recording a voiceover, so the mic doesn't pick it up). */
export function setPreviewMuted(muted: boolean): void {
  previewMuted = muted;
  if (muted) stopAudio();
}

function context(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext({ latencyHint: "interactive" });
  return ctx;
}

/** Resumes the audio context on the next user gesture. Returns a cleanup function. */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    const c = context();
    if (c && c.state !== "running") void c.resume();
  };
  const events = ["pointerdown", "touchend", "click", "keydown"] as const;
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, unlock));
}

/** Starts playing the project's audio from `from`. Returns false if audio isn't available. */
export function startAudio(project: Project, from: Micros): boolean {
  stopAudio();
  const c = context();
  if (!c || c.state !== "running" || previewMuted) return false;
  // A small lead so the first nodes aren't scheduled in the past.
  startedAt = c.currentTime + 0.05;
  nodes = scheduleAudio(c, planAudio(project, from), decodedAudio, c.destination, startedAt);
  return true;
}

export function stopAudio(): void {
  for (const node of nodes) {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
    node.disconnect();
  }
  nodes = [];
  startedAt = 0;
}

/** Seconds of audio played since `startAudio`, or null when the audio clock isn't running. */
export function audioElapsed(): number | null {
  if (!ctx || ctx.state !== "running" || startedAt === 0) return null;
  return Math.max(0, ctx.currentTime - startedAt);
}
