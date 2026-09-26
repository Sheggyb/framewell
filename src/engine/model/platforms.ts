export type PlatformId = "tiktok" | "reels" | "shorts" | "square" | "portrait" | "landscape";

/** Insets as fractions of the frame. Areas outside the safe zone are covered by platform UI. */
export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlatformPreset {
  id: PlatformId;
  label: string;
  width: number;
  height: number;
  fps: number;
  safeZone: SafeZone | null;
}

// Safe-zone insets are approximations of each app's UI (captions, buttons, tabs).
// Platforms change their layouts; re-check these against current apps before launch.
export const PLATFORMS: Record<PlatformId, PlatformPreset> = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: { top: 0.07, right: 0.12, bottom: 0.2, left: 0.05 },
  },
  reels: {
    id: "reels",
    label: "Reels",
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: { top: 0.1, right: 0.1, bottom: 0.2, left: 0.05 },
  },
  shorts: {
    id: "shorts",
    label: "Shorts",
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: { top: 0.08, right: 0.13, bottom: 0.18, left: 0.05 },
  },
  square: { id: "square", label: "1:1", width: 1080, height: 1080, fps: 30, safeZone: null },
  portrait: { id: "portrait", label: "4:5", width: 1080, height: 1350, fps: 30, safeZone: null },
  landscape: { id: "landscape", label: "16:9", width: 1920, height: 1080, fps: 30, safeZone: null },
};

export const PLATFORM_ORDER: PlatformId[] = ["tiktok", "reels", "shorts", "square", "portrait", "landscape"];
