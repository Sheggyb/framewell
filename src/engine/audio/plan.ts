/**
 * Works out which audio plays when, as plain data. Shared by live playback
 * (AudioContext) and export (OfflineAudioContext).
 */
import { clipEnd } from "../model/ops";
import type { Id, MediaClip, Project } from "../model/project";
import { usToSeconds, type Micros } from "../model/time";

export interface AudioPlan {
  clipId: Id;
  assetId: Id;
  /** Seconds after the playback start at which this clip becomes audible. */
  when: number;
  /** Seconds into the source media to start from. */
  offset: number;
  /** Seconds to play. */
  duration: number;
  speed: number;
  volume: number;
  /** Seconds already elapsed within the clip at `when` (non-zero when starting mid-clip). */
  clipTime: number;
  clipDuration: number;
  fadeIn: number;
  fadeOut: number;
}

/** Audio for everything that plays from `from` to the end of the project. */
export function planAudio(project: Project, from: Micros): AudioPlan[] {
  const plans: AudioPlan[] = [];
  for (const track of project.tracks) {
    if (track.muted || (track.kind !== "main" && track.kind !== "audio" && track.kind !== "overlay")) continue;
    for (const clip of track.clips) {
      if (clip.type !== "media" || clipEnd(clip) <= from || clip.volume <= 0) continue;
      if (!project.assets[clip.assetId]?.hasAudio) continue;
      plans.push(planClip(clip, from));
    }
  }
  return plans;
}

function planClip(clip: MediaClip, from: Micros): AudioPlan {
  const start = Math.max(clip.start, from);
  const elapsed = start - clip.start;
  return {
    clipId: clip.id,
    assetId: clip.assetId,
    when: usToSeconds(start - from),
    offset: usToSeconds(clip.sourceIn + elapsed * clip.speed),
    duration: usToSeconds(clipEnd(clip) - start),
    speed: clip.speed,
    volume: clip.volume,
    clipTime: usToSeconds(elapsed),
    clipDuration: usToSeconds(clip.duration),
    fadeIn: usToSeconds(clip.fadeIn),
    fadeOut: usToSeconds(clip.fadeOut),
  };
}

/** Gain at `t` seconds into a clip, including fades. */
export function gainAt(plan: Pick<AudioPlan, "volume" | "clipDuration" | "fadeIn" | "fadeOut">, t: number): number {
  let g = plan.volume;
  if (plan.fadeIn > 0 && t < plan.fadeIn) g *= Math.max(0, t / plan.fadeIn);
  const remaining = plan.clipDuration - t;
  if (plan.fadeOut > 0 && remaining < plan.fadeOut) g *= Math.max(0, remaining / plan.fadeOut);
  return g;
}

/**
 * Schedules planned clips on any audio context. `startAt` is the context time that
 * corresponds to plan time 0. Returns the created nodes so playback can stop them.
 */
export function scheduleAudio(
  ctx: BaseAudioContext,
  plans: AudioPlan[],
  buffers: (assetId: Id) => AudioBuffer | undefined,
  destination: AudioNode,
  startAt: number,
): AudioScheduledSourceNode[] {
  const nodes: AudioScheduledSourceNode[] = [];
  for (const plan of plans) {
    const buffer = buffers(plan.assetId);
    if (!buffer || plan.duration <= 0) continue;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = plan.speed;
    const gain = ctx.createGain();
    source.connect(gain).connect(destination);

    const t0 = startAt + plan.when;
    const end = t0 + plan.duration;
    gain.gain.setValueAtTime(gainAt(plan, plan.clipTime), t0);
    if (plan.fadeIn > 0 && plan.clipTime < plan.fadeIn) {
      gain.gain.linearRampToValueAtTime(gainAt(plan, plan.fadeIn), t0 + plan.fadeIn - plan.clipTime);
    }
    if (plan.fadeOut > 0) {
      const fadeStart = t0 + Math.max(0, plan.clipDuration - plan.fadeOut - plan.clipTime);
      if (fadeStart > t0) gain.gain.setValueAtTime(gainAt(plan, plan.clipDuration - plan.fadeOut), fadeStart);
      gain.gain.linearRampToValueAtTime(0, end);
    }

    source.start(t0, plan.offset, plan.duration * plan.speed);
    nodes.push(source);
  }
  return nodes;
}
