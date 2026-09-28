/**
 * Renders a project to a video file entirely on-device: frames through the same
 * compositor as the preview, audio mixed in an OfflineAudioContext, encoded with
 * WebCodecs via Mediabunny. MP4 (H.264/AAC) when possible, WebM (VP9/Opus) otherwise.
 *
 * Runs on the main thread for now (text needs document fonts); a worker version is M2+.
 */
import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
} from "mediabunny";
import { planAudio, scheduleAudio } from "../audio/plan";
import { createSequentialFrames, prepareAudio } from "../media/registry";
import { projectDuration } from "../model/ops";
import type { Project } from "../model/project";
import type { TextStyle } from "../model/text";
import { frameToUs, secondsToUs, usToSeconds } from "../model/time";
import { composeFrame, visibleTextClips } from "../render/compose";
import type { FontResolver } from "../render/text";

export type ExportResolution = 720 | 1080;
export type ExportFps = 24 | 30 | 60;

export interface ExportOptions {
  /** Short side of the output in pixels. */
  resolution: ExportResolution;
  fps: ExportFps;
  fonts: FontResolver;
  ensureFonts: (styles: TextStyle[]) => Promise<void>;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
  seconds: number;
  /** Things the user should know about the file (e.g. it has no sound). */
  warnings: string[];
}

export class ExportError extends Error {}

const SAMPLE_RATE = 48_000;
const YIELD_EVERY_FRAMES = 5;
/** Audio is mixed this many seconds at a time, so long videos don't need one huge buffer. */
const MIX_CHUNK_SECONDS = 10;
/**
 * Videos are decoded at most this much bigger than the output's long edge (zoomed or cropped
 * clips need some extra detail). Decoding 4K phone footage at full size can run a phone out of memory.
 */
const DECODE_HEADROOM = 1.25;

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function outputSize(project: Project, resolution: ExportResolution) {
  const { width, height } = project.canvas;
  const scale = Math.min(1, resolution / Math.min(width, height));
  return { width: even(width * scale), height: even(height * scale), scale };
}

/**
 * Prepares the project's sound. Returns null when there is none, else a function that mixes
 * the next chunk each time it is called (null once the end is reached).
 */
async function audioMixer(project: Project, seconds: number): Promise<(() => Promise<AudioBuffer | null>) | null> {
  const all = planAudio(project, 0);
  if (all.length === 0) return null;
  const buffers = new Map(await Promise.all(all.map(async (p) => [p.assetId, await prepareAudio(p.assetId)] as const)));
  if (![...buffers.values()].some(Boolean)) return null;
  let from = 0;
  return async () => {
    if (from >= seconds) return null;
    const length = Math.min(MIX_CHUNK_SECONDS, seconds - from);
    const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(length * SAMPLE_RATE)), SAMPLE_RATE);
    const plans = planAudio(project, secondsToUs(from)).filter((p) => p.when < length);
    scheduleAudio(ctx, plans, (id) => buffers.get(id) ?? undefined, ctx.destination, 0);
    from += length;
    return ctx.startRendering();
  };
}

export async function exportProject(project: Project, options: ExportOptions): Promise<ExportResult> {
  const { signal, onProgress } = options;
  const durationUs = projectDuration(project);
  if (durationUs === 0) throw new ExportError("Add something to the timeline first.");
  const seconds = usToSeconds(durationUs);
  const { width, height, scale } = outputSize(project, options.resolution);

  // Prefer MP4/H.264: it plays everywhere and uploads to every platform.
  let format: Mp4OutputFormat | WebMOutputFormat = new Mp4OutputFormat({ fastStart: "in-memory" });
  let videoCodec = await getFirstEncodableVideoCodec(["avc"], { width, height });
  let audioCodecs: ("aac" | "opus")[] = ["aac", "opus"];
  if (!videoCodec) {
    format = new WebMOutputFormat();
    videoCodec = await getFirstEncodableVideoCodec(["vp9", "vp8"], { width, height });
    audioCodecs = ["opus"];
  }
  if (!videoCodec) {
    throw new ExportError(
      options.resolution > 720
        ? "This device can't save video at this size. Try 720p."
        : "This browser can't encode video. Try the latest Chrome or Safari.",
    );
  }

  onProgress(0);
  const warnings: string[] = [];
  const nextAudio = await audioMixer(project, seconds);
  const audioCodec = nextAudio
    ? await getFirstEncodableAudioCodec(audioCodecs, { numberOfChannels: 2, sampleRate: SAMPLE_RATE })
    : null;
  if (nextAudio && !audioCodec) {
    warnings.push("This browser can't save sound, so the video is silent. Try the latest Chrome or Safari.");
  } else if (audioCodec === "opus" && format instanceof Mp4OutputFormat) {
    warnings.push("The sound was saved in a format some apps can't play. If there's no sound after uploading, try another browser.");
  }
  if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ExportError("Couldn't create a drawing surface for export.");

  const output = new Output({ format, target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: options.fps });
  const audioSource = nextAudio && audioCodec ? new AudioBufferSource({ codec: audioCodec, bitrate: QUALITY_HIGH }) : null;
  if (audioSource) output.addAudioTrack(audioSource);

  const frames = createSequentialFrames(Math.round(Math.max(width, height) * DECODE_HEADROOM));
  try {
    await output.start();
    if (audioSource && nextAudio) {
      for (let chunk = await nextAudio(); chunk; chunk = await nextAudio()) {
        if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");
        await audioSource.add(chunk);
      }
    }

    const frameCount = Math.max(1, Math.ceil(seconds * options.fps));
    for (let i = 0; i < frameCount; i++) {
      if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");
      const t = frameToUs(i, options.fps);
      await options.ensureFonts(visibleTextClips(project, t).map((c) => c.style));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      await composeFrame(ctx, project, t, frames.frames, { fonts: options.fonts });
      await videoSource.add(i / options.fps, 1 / options.fps);
      onProgress((i + 1) / frameCount);
      // Let the progress UI paint.
      if (i % YIELD_EVERY_FRAMES === 0) await new Promise((r) => setTimeout(r, 0));
    }

    await output.finalize();
  } catch (err) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel().catch(() => {});
    throw err;
  } finally {
    frames.close();
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new ExportError("Export produced no data.");
  const mimeType = await output.getMimeType();
  const ext = format instanceof Mp4OutputFormat ? "mp4" : "webm";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return {
    blob: new Blob([buffer], { type: mimeType.split(";")[0] }),
    fileName: `framewell-${stamp}.${ext}`,
    width,
    height,
    seconds,
    warnings,
  };
}
