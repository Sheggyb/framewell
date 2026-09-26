"use client";

import { Maximize2, Minimize2, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

type FullscreenDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

const fullscreenElement = () => document.fullscreenElement ?? (document as FullscreenDoc).webkitFullscreenElement;

/** Opened from the Home Screen, the editor already runs full screen with no browser bars. */
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const canFullscreen = () =>
  document.fullscreenEnabled || typeof (document.documentElement as FullscreenEl).webkitRequestFullscreen === "function";

async function toggleFullscreen() {
  try {
    if (fullscreenElement()) {
      await (document.exitFullscreen?.() ?? (document as FullscreenDoc).webkitExitFullscreen?.());
    } else {
      const el = document.documentElement as FullscreenEl;
      await (el.requestFullscreen?.({ navigationUI: "hide" }) ?? el.webkitRequestFullscreen?.());
    }
  } catch {
    // Refused (e.g. not triggered by a tap); nothing else to do.
  }
}

/**
 * "App mode": full screen where the browser allows it. iPhone Safari doesn't let websites go
 * full screen, so there it explains Add to Home Screen, which opens Framewell like an app.
 */
export function AppModeButton() {
  const [state, setState] = useState<{ standalone: boolean; fullscreen: boolean } | null>(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    const update = () => setState({ standalone: isStandalone(), fullscreen: Boolean(fullscreenElement()) });
    update();
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, []);

  if (!state || state.standalone) return null;

  return (
    <>
      <button
        type="button"
        aria-label={state.fullscreen ? "Exit full screen" : "Full screen"}
        title={state.fullscreen ? "Exit full screen" : "Full screen"}
        onClick={() => (canFullscreen() ? void toggleFullscreen() : setShowTip(true))}
        className="flex size-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white [&_svg]:size-[18px]"
      >
        {state.fullscreen ? <Minimize2 /> : <Maximize2 />}
      </button>

      {showTip && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onPointerDown={(e) => e.target === e.currentTarget && setShowTip(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Use Framewell like an app"
            className="w-full max-w-sm rounded-t-2xl bg-neutral-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Use Framewell full screen</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowTip(false)}
                className="flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-300"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              Add it to your Home Screen and it opens like an app: full screen, no browser bars, nothing to swipe away
              by accident.
            </p>
            <ol className="mt-4 flex flex-col gap-3 text-sm text-neutral-200">
              <li className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Share className="size-4" />
                </span>
                Tap <b>Share</b> in Safari&apos;s toolbar
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <SquarePlus className="size-4" />
                </span>
                Choose <b>Add to Home Screen</b>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg border border-gold/50 font-display text-base italic text-gold-soft">
                  F
                </span>
                Open Framewell from your Home Screen
              </li>
            </ol>
            <p className="mt-4 text-xs text-neutral-500">Your projects are saved on this device either way.</p>
          </div>
        </div>
      )}
    </>
  );
}
