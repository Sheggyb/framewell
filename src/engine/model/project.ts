import { PLATFORMS, type PlatformId } from "./platforms";
import type { ClipColor } from "./color";
import type { Transition } from "./transition";
import type { ClipZoom } from "./zoom";
import type { TextAnimation, TextStyle, TextTransform } from "./text";
import type { Micros } from "./time";

/** Bump when the saved project shape changes, and add a migration (see migrate.ts). */
export const PROJECT_SCHEMA_VERSION = 5;

export type Id = string;

export type AssetKind = "video" | "audio" | "image";

export interface MediaAsset {
  id: Id;
  kind: AssetKind;
  name: string;
  mimeType: string;
  size: number;
  /** Natural duration. Images get a default still duration. */
  duration: Micros;
  width?: number;
  height?: number;
  hasAudio: boolean;
}

/** Where a media clip sits in the frame. Position is its centre as a fraction of the canvas. */
export interface MediaFrame {
  /** "fit" shows the whole (cropped) picture; "fill" covers the canvas. */
  fit: "fit" | "fill";
  x: number;
  y: number;
  /** Zoom on top of fit/fill. */
  scale: number;
  rotation: number;
  flipH: boolean;
}

/** Visible part of the source, as fractions of its width/height. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

/**
 * What fills the space around a main-track picture that doesn't cover the frame (e.g. a
 * landscape clip in a vertical video): black, a blurred copy of the picture, or a colour.
 */
export interface Backdrop {
  type: "none" | "blur" | "color";
  /** Blur strength, 0–1. */
  blur: number;
  color: string;
}

export const DEFAULT_BACKDROP: Backdrop = { type: "none", blur: 0.6, color: "#1c1917" };

interface ClipBase {
  id: Id;
  /** Position on the timeline. */
  start: Micros;
  /** Length on the timeline (after speed is applied). */
  duration: Micros;
}

export interface MediaClip extends ClipBase {
  type: "media";
  assetId: Id;
  /** Offset into the source media where this clip begins. */
  sourceIn: Micros;
  speed: number;
  /** Linear gain, 1 = original. */
  volume: number;
  fadeIn: Micros;
  fadeOut: Micros;
  /** Transition from the previous main-track clip into this one. */
  transition: Transition | null;
  frame: MediaFrame;
  crop: CropRect;
  /** Filter + colour adjustments. */
  color: ClipColor;
  /** Camera move and punch-ins. */
  zoom: ClipZoom;
  /** Fill behind the picture (main track only). */
  backdrop: Backdrop;
}

export interface TextClip extends ClipBase {
  type: "text";
  text: string;
  style: TextStyle;
  transform: TextTransform;
  animation: TextAnimation;
  /** Wrap width as a fraction of the canvas width. */
  maxWidth: number;
}

export type Clip = MediaClip | TextClip;

/** `main` holds the video; it is magnetic (packed end-to-end) when `Project.mainMagnet` is on. */
export type TrackKind = "main" | "overlay" | "text" | "caption" | "audio";

export interface Track {
  id: Id;
  kind: TrackKind;
  clips: Clip[];
  muted: boolean;
  hidden: boolean;
}

export interface CanvasSettings {
  width: number;
  height: number;
  fps: number;
}

export interface Project {
  version: typeof PROJECT_SCHEMA_VERSION;
  id: Id;
  name: string;
  createdAt: number;
  updatedAt: number;
  platform: PlatformId;
  canvas: CanvasSettings;
  assets: Record<Id, MediaAsset>;
  tracks: Track[];
  /**
   * On: main-track clips stay packed end-to-end (delete closes gaps, drag reorders).
   * Off: clips sit wherever you put them, like text; gaps show black.
   */
  mainMagnet: boolean;
  /** Beat markers (sorted times) that cuts and clips snap to. */
  markers: Micros[];
}

// crypto.randomUUID only exists in secure contexts; fall back so plain-http LAN testing still boots.
export function newId(): Id {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTrack(kind: TrackKind): Track {
  return { id: newId(), kind, clips: [], muted: false, hidden: false };
}

export function createProject(platform: PlatformId = "tiktok", name = "Untitled video"): Project {
  const preset = PLATFORMS[platform];
  const now = Date.now();
  return {
    version: PROJECT_SCHEMA_VERSION,
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    platform,
    canvas: { width: preset.width, height: preset.height, fps: preset.fps },
    assets: {},
    tracks: [createTrack("main"), createTrack("text"), createTrack("audio")],
    mainMagnet: false,
    markers: [],
  };
}
