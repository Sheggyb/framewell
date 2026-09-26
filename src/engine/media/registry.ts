/**
 * In-memory registry of imported files and their decoders, keyed by asset id.
 * Media stays out of the (serialisable) project state; files are persisted by src/lib/storage.
 */
import {
  ALL_FORMATS,
  AudioBufferSink,
  BlobSource,
  CanvasSink,
  Input,
  type CanvasSinkOptions,
  type InputAudioTrack,
  type InputVideoTrack,
  type WrappedCanvas,
} from "mediabunny";
import type { Id, MediaAsset, MediaClip } from "../model/project";
import { newId } from "../model/project";
import { secondsToUs } from "../model/time";

/** Longest edge of preview frames. Keeps memory in check on phones. */
const PREVIEW_MAX_EDGE = 1080;
const DEFAULT_IMAGE_DURATION_S = 3;

interface Entry {
  file: File;
  input?: Input;
  video?: InputVideoTrack;
  sinkOptions?: CanvasSinkOptions;
  /** Random-access frames for scrubbing. */
  sink?: CanvasSink;
  bitmap?: ImageBitmap;
  audio?: InputAudioTrack;
  /** Whole-file decoded audio, filled in the background after import. */
  audioBuffer?: Promise<AudioBuffer | null>;
  decodedAudio?: AudioBuffer;
}

const entries = new Map<Id, Entry>();

export class MediaImportError extends Error {}

/** Reads a file and registers its decoders. Pass `id` to restore a saved asset under its old id. */
export async function importFile(file: File, id: Id = newId()): Promise<MediaAsset> {
  const base = { id, name: file.name, mimeType: file.type, size: file.size };

  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new MediaImportError(`Couldn't read image "${file.name}".`);
    });
    entries.set(id, { file, bitmap });
    return {
      ...base,
      kind: "image",
      duration: secondsToUs(DEFAULT_IMAGE_DURATION_S),
      width: bitmap.width,
      height: bitmap.height,
      hasAudio: false,
    };
  }

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const [video, audio] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    if (!video && !audio) throw new MediaImportError(`"${file.name}" has no video or audio.`);
    if (video && !(await video.canDecode())) {
      throw new MediaImportError(`This browser can't decode the ${video.codec ?? "unknown"} video in "${file.name}".`);
    }

    const duration = secondsToUs(await input.computeDuration());
    let sink: CanvasSink | undefined;
    let sinkOptions: CanvasSinkOptions | undefined;
    if (video) {
      sinkOptions =
        video.displayWidth >= video.displayHeight
          ? { width: Math.min(video.displayWidth, PREVIEW_MAX_EDGE) }
          : { height: Math.min(video.displayHeight, PREVIEW_MAX_EDGE) };
      sink = new CanvasSink(video, { ...sinkOptions, poolSize: 2 });
    }
    entries.set(id, { file, input, video: video ?? undefined, sinkOptions, sink, audio: audio ?? undefined });

    return {
      ...base,
      kind: video ? "video" : "audio",
      duration,
      width: video?.displayWidth,
      height: video?.displayHeight,
      hasAudio: audio !== null,
    };
  } catch (err) {
    input.dispose();
    if (err instanceof MediaImportError) throw err;
    throw new MediaImportError(`"${file.name}" isn't a supported media file.`);
  }
}

/** Returns a drawable frame for the asset at the given source time, or null if none. */
export async function getFrame(
  assetId: Id,
  sourceSeconds: number,
): Promise<HTMLCanvasElement | OffscreenCanvas | ImageBitmap | null> {
  const entry = entries.get(assetId);
  if (!entry) return null;
  if (entry.bitmap) return entry.bitmap;
  if (!entry.sink) return null;
  const wrapped = await entry.sink.getCanvas(sourceSeconds);
  return wrapped?.canvas ?? null;
}

/** If playback falls this far behind the decoder, jump ahead instead of decoding every frame. */
const MAX_LAG_S = 0.5;
const STREAM_POOL_SIZE = 4;

/**
 * Sequential frame reader for playback. Decoding forwards from one point is far
 * cheaper than random access per frame. Calls to `frameAt` must not overlap.
 */
export class FrameStream {
  private iterator: AsyncGenerator<WrappedCanvas, void, unknown>;
  private current: WrappedCanvas | null = null;
  private next: WrappedCanvas | null = null;
  private done = false;

  constructor(
    private readonly sink: CanvasSink,
    startSeconds: number,
  ) {
    this.iterator = sink.canvases(startSeconds);
  }

  async frameAt(seconds: number): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
    if (this.next && this.next.timestamp < seconds - MAX_LAG_S) this.restart(seconds);
    while (!this.done) {
      if (!this.next) {
        const result = await this.iterator.next();
        if (result.done) {
          this.done = true;
          break;
        }
        this.next = result.value;
      }
      if (this.next.timestamp > seconds) break;
      this.current = this.next;
      this.next = null;
    }
    return (this.current ?? this.next)?.canvas ?? null;
  }

  private restart(seconds: number) {
    void this.iterator.return(undefined).catch(() => {});
    this.iterator = this.sink.canvases(seconds);
    this.current = null;
    this.next = null;
    this.done = false;
  }

  close() {
    void this.iterator.return(undefined).catch(() => {});
  }
}

/** `fullResolution` skips the preview downscale (for export). */
export function openFrameStream(assetId: Id, startSeconds: number, fullResolution = false): FrameStream | null {
  const entry = entries.get(assetId);
  if (!entry?.video) return null;
  const size = fullResolution ? {} : entry.sinkOptions;
  const sink = new CanvasSink(entry.video, { ...size, poolSize: STREAM_POOL_SIZE });
  return new FrameStream(sink, startSeconds);
}

type Drawable = HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/**
 * Frame provider for forward playback/export: one decoding stream per clip, opened on
 * first use. The two most recently used streams stay open.
 */
export function createSequentialFrames(fullResolution = false) {
  // Several streams: a transition reads two clips, overlays add more.
  const MAX_STREAMS = 4;
  const streams = new Map<Id, FrameStream>();
  const close = () => {
    streams.forEach((s) => s.close());
    streams.clear();
  };
  const frames = async (clip: MediaClip, seconds: number): Promise<Drawable | null> => {
    let stream = streams.get(clip.id);
    if (!stream) {
      if (streams.size >= MAX_STREAMS) {
        const [oldestId, oldest] = streams.entries().next().value!;
        oldest.close();
        streams.delete(oldestId);
      }
      const opened = openFrameStream(clip.assetId, seconds, fullResolution);
      if (!opened) return getFrame(clip.assetId, seconds); // images
      streams.set(clip.id, opened);
      stream = opened;
    }
    return stream.frameAt(seconds);
  };
  return { frames, close };
}

/** Starts (or reuses) decoding an asset's full audio track. Resolves null if it has none. */
export function prepareAudio(assetId: Id): Promise<AudioBuffer | null> {
  const entry = entries.get(assetId);
  if (!entry?.audio) return Promise.resolve(null);
  entry.audioBuffer ??= decodeWholeTrack(entry.audio)
    .then((buffer) => {
      entry.decodedAudio = buffer;
      notifyAudioReady();
      return buffer;
    })
    .catch(() => null);
  return entry.audioBuffer;
}

/** Decoded audio if it's ready, otherwise undefined (the clip is silent until then). */
export const decodedAudio = (assetId: Id): AudioBuffer | undefined => entries.get(assetId)?.decodedAudio;

const MAX_CHANNELS = 2;

async function decodeWholeTrack(track: InputAudioTrack): Promise<AudioBuffer> {
  const sampleRate = track.sampleRate;
  const channels = Math.min(MAX_CHANNELS, Math.max(1, track.numberOfChannels));
  // Allocate once up front and copy chunks in as they decode, instead of holding them all.
  const length = Math.ceil((await track.computeDuration()) * sampleRate) + 1;
  const out = new AudioBuffer({ length, numberOfChannels: channels, sampleRate });

  for await (const chunk of new AudioBufferSink(track).buffers()) {
    const start = Math.round(chunk.timestamp * sampleRate);
    const at = Math.max(0, start);
    for (let ch = 0; ch < channels; ch++) {
      let data = chunk.buffer.getChannelData(Math.min(ch, chunk.buffer.numberOfChannels - 1));
      if (start < 0) data = data.subarray(-start); // drop samples before 0 (encoder priming)
      if (at + data.length > length) data = data.subarray(0, Math.max(0, length - at));
      out.copyToChannel(data, ch, at);
    }
  }
  return out;
}

export function releaseAsset(assetId: Id): void {
  const entry = entries.get(assetId);
  if (!entry) return;
  entry.input?.dispose();
  entry.bitmap?.close();
  entries.delete(assetId);
}

const THUMB_HEIGHT = 96;
const thumbnails = new Map<string, Promise<string | null>>();
const thumbSinks = new Map<Id, CanvasSink>();
/** Thumbnail requests per asset run one at a time (a CanvasSink shouldn't serve overlapping calls). */
const thumbQueues = new Map<Id, Promise<unknown>>();

async function canvasToUrl(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<string | null> {
  const blob =
    "convertToBlob" in canvas
      ? await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 })
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * A small JPEG (object URL) of an asset at `seconds`, for timeline clip strips. Cached per
 * half second, so scrolling and zooming reuse the same images.
 */
export function thumbnailUrl(assetId: Id, seconds: number): Promise<string | null> {
  const entry = entries.get(assetId);
  if (!entry) return Promise.resolve(null);
  const key = entry.bitmap ? assetId : `${assetId}@${(Math.round(seconds * 2) / 2).toFixed(1)}`;
  const cached = thumbnails.get(key);
  if (cached) return cached;

  const work = async (): Promise<string | null> => {
    if (entry.bitmap) {
      const canvas = new OffscreenCanvas(Math.round((THUMB_HEIGHT * entry.bitmap.width) / entry.bitmap.height), THUMB_HEIGHT);
      canvas.getContext("2d")?.drawImage(entry.bitmap, 0, 0, canvas.width, canvas.height);
      return canvasToUrl(canvas);
    }
    if (!entry.video) return null;
    let sink = thumbSinks.get(assetId);
    if (!sink) {
      sink = new CanvasSink(entry.video, { height: THUMB_HEIGHT, poolSize: 1 });
      thumbSinks.set(assetId, sink);
    }
    const wrapped = await sink.getCanvas(Math.max(0, seconds));
    return wrapped ? canvasToUrl(wrapped.canvas) : null;
  };

  const queued = (thumbQueues.get(assetId) ?? Promise.resolve()).then(work).catch(() => null);
  thumbQueues.set(assetId, queued);
  thumbnails.set(key, queued);
  return queued;
}

const PEAKS_PER_SECOND = 50;
const peaks = new Map<Id, Float32Array>();
const audioListeners = new Set<() => void>();
let audioVersion = 0;

/** Subscribe to "some asset's audio finished decoding" (for waveforms). Returns unsubscribe. */
export function onAudioReady(listener: () => void): () => void {
  audioListeners.add(listener);
  return () => audioListeners.delete(listener);
}

export const audioReadyVersion = () => audioVersion;

function notifyAudioReady() {
  audioVersion++;
  audioListeners.forEach((l) => l());
}

/**
 * Loudness peaks (0–1) at `PEAKS_PER_SECOND`, or undefined until the audio has decoded.
 * Returns `[peaks, peaksPerSecond]`.
 */
export function waveform(assetId: Id): [Float32Array, number] | undefined {
  const cached = peaks.get(assetId);
  if (cached) return [cached, PEAKS_PER_SECOND];
  const buffer = decodedAudio(assetId);
  if (!buffer) return undefined;
  const bucket = Math.max(1, Math.floor(buffer.sampleRate / PEAKS_PER_SECOND));
  const out = new Float32Array(Math.ceil(buffer.length / bucket));
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < out.length; i++) {
      let max = out[i];
      const end = Math.min(data.length, (i + 1) * bucket);
      // Stride through the bucket; every 4th sample is plenty for a display waveform.
      for (let j = i * bucket; j < end; j += 4) {
        const v = Math.abs(data[j]);
        if (v > max) max = v;
      }
      out[i] = max;
    }
  }
  // Normalise so quiet recordings still show a readable shape.
  let loudest = 0;
  for (const v of out) if (v > loudest) loudest = v;
  if (loudest > 0) for (let i = 0; i < out.length; i++) out[i] = Math.min(1, out[i] / loudest);
  peaks.set(assetId, out);
  return [out, PEAKS_PER_SECOND];
}
