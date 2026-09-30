"use client";

import type { SafeZone } from "@/engine/model/platforms";
import { useT } from "@/i18n";

/** Dims the areas a platform's UI covers and outlines the safe area. */
export function SafeZoneOverlay({ zone, label }: { zone: SafeZone; label: string }) {
  const t = useT();
  return (
    <div dir="ltr" className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute rounded-sm border border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
        style={{
          top: `${zone.top * 100}%`,
          right: `${zone.right * 100}%`,
          bottom: `${zone.bottom * 100}%`,
          left: `${zone.left * 100}%`,
        }}
      >
        <span className="absolute -top-5 left-0 text-[10px] font-medium text-white/80">{t("editor.canvas.safeZone", { platform: label })}</span>
      </div>
    </div>
  );
}
