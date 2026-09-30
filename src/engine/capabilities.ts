/**
 * Feature detection run once at startup. Decides what the editor offers on this
 * device. Never UA-sniff: ask the browser what it can actually do.
 */
export type DeviceTier = "full" | "lite" | "unsupported";

/** Why the device is unsupported: "insecure" (not HTTPS/localhost), "no-webcodecs" (can't process video). */
export type UnsupportedReason = "insecure" | "no-webcodecs";

export interface Capabilities {
  secureContext: boolean;
  crossOriginIsolated: boolean;
  webCodecs: boolean;
  /** Can encode 1080×1920 H.264, the default export. */
  h264Encode: boolean;
  aacEncode: boolean;
  opfs: boolean;
  wakeLock: boolean;
  share: boolean;
  touch: boolean;
  /** Approximate RAM in GB (Chromium only). */
  deviceMemoryGb: number | null;
  tier: DeviceTier;
  /** Why, when tier is "unsupported" (the UI shows it in the user's language). */
  reason: UnsupportedReason | null;
}

async function supports(check: () => Promise<{ supported?: boolean }> | undefined): Promise<boolean> {
  try {
    return (await check())?.supported === true;
  } catch {
    return false;
  }
}

export async function detectCapabilities(): Promise<Capabilities> {
  const secureContext = window.isSecureContext;
  const webCodecs = typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined";

  const h264Encode =
    webCodecs &&
    (await supports(() =>
      VideoEncoder.isConfigSupported({
        codec: "avc1.640028",
        width: 1080,
        height: 1920,
        bitrate: 8_000_000,
        framerate: 30,
      }),
    ));

  const aacEncode =
    typeof AudioEncoder !== "undefined" &&
    (await supports(() =>
      AudioEncoder.isConfigSupported({
        codec: "mp4a.40.2",
        sampleRate: 48_000,
        numberOfChannels: 2,
        bitrate: 128_000,
      }),
    ));

  const deviceMemoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  const touch = window.matchMedia("(pointer: coarse)").matches;

  let tier: DeviceTier = "full";
  let reason: UnsupportedReason | null = null;
  if (!secureContext) {
    tier = "unsupported";
    reason = "insecure";
  } else if (!webCodecs) {
    tier = "unsupported";
    reason = "no-webcodecs";
  } else if (touch || (deviceMemoryGb !== null && deviceMemoryGb <= 4)) {
    tier = "lite";
  }

  return {
    secureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    webCodecs,
    h264Encode,
    aacEncode,
    opfs: typeof navigator.storage?.getDirectory === "function",
    wakeLock: "wakeLock" in navigator,
    share: typeof navigator.canShare === "function",
    touch,
    deviceMemoryGb,
    tier,
    reason,
  };
}
