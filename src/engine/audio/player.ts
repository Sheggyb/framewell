/**
 * Live audio playback for the editor preview. Browsers (iOS especially) only let an
 * AudioContext start from a user gesture, so `installAudioUnlock` resumes it on the first tap.
 */
import { decodedAudio } from "../media/registry";
import type { Project } from "../model/project";
import type { Micros } from "../model/time";
import { planAudio, scheduleAudio } from "./plan";

let ctx: AudioContext | null = null;
/** Everything plays through this, so sound can be switched off instantly, even mid-playback. */
let master: GainNode | null = null;
let nodes: AudioScheduledSourceNode[] = [];
let startedAt = 0;
let previewMuted = false;
let userMuted = false;

type SessionType = "auto" | "playback" | "play-and-record" | "ambient";

/**
 * Safari's audio session (iOS 16.4+). "playback" makes the editor sound like a video app: it
 * plays with the silent switch on and through the speaker. Without it, iPhones silence Web
 * Audio in silent mode, while ordinary videos still play, which looks like a bug.
 */
export function setAudioSession(type: SessionType): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: SessionType } }).audioSession;
    if (session) session.type = type;
  } catch {
    // Not supported: nothing to do.
  }
}

/** Silences preview playback (e.g. while recording a voiceover, so the mic doesn't pick it up). */
export function setPreviewMuted(muted: boolean): void {
  previewMuted = muted;
  if (muted) stopAudio();
}

/** The sound on/off button in the editor. Takes effect immediately. */
export function setUserMuted(muted: boolean): void {
  userMuted = muted;
  if (master && ctx) master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
}

function context(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    setAudioSession("playback");
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = userMuted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Resumes the audio context on the next user gesture. Returns a cleanup function. */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    const c = context();
    if (c && c.state !== "running") {
      setAudioSession("playback");
      void c.resume();
    }
  };
  const events = ["pointerdown", "touchend", "click", "keydown"] as const;
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, unlock));
}

/** Starts playing the project's audio from `from`. Returns false if audio isn't available. */
export function startAudio(project: Project, from: Micros): boolean {
  stopAudio();
  const c = context();
  if (!c || !master || c.state !== "running" || previewMuted) return false;
  // A small lead so the first nodes aren't scheduled in the past.
  startedAt = c.currentTime + 0.05;
  nodes = scheduleAudio(c, planAudio(project, from), decodedAudio, master, startedAt);
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

/** Clips that should make sound but whose audio is still being prepared (just imported). */
export function audioPending(project: Project, from: Micros = 0): boolean {
  return planAudio(project, from).some((p) => project.assets[p.assetId]?.hasAudio && !decodedAudio(p.assetId));
}
