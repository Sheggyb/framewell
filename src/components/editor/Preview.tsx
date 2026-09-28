"use client";

import { LayoutTemplate, Plus, Type } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { createSequentialFrames, getFrame } from "@/engine/media/registry";
import { findClip, clipEnd } from "@/engine/model/ops";
import { PLATFORMS } from "@/engine/model/platforms";
import type { TextClip } from "@/engine/model/project";
import { templateShowcaseOffset } from "@/engine/model/templates";
import type { Micros } from "@/engine/model/time";
import { composeFrame, visibleTextClips, type FrameProvider } from "@/engine/render/compose";
import { ensureFontsLoaded, fontFamilyFor } from "@/lib/fonts";
import { templateClipsAt } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { CanvasOverlay } from "./CanvasOverlay";
import { CropOverlay } from "./CropOverlay";

/** The clips on screen at `t` (the moment a browsed template is fully visible). */
const visibleAt = (clips: TextClip[], t: Micros) => clips.filter((c) => t >= c.start && t < clipEnd(c));

export function Preview({ onImport, onAddText, onTemplates }: { onImport: () => void; onAddText: () => void; onTemplates: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const playing = useEditor((s) => s.playing);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const showSafeZone = useEditor((s) => s.showSafeZone);
  const panel = useEditor((s) => s.panel);
  const templatePreview = useEditor((s) => s.templatePreview);
  const dirty = useRef(false);
  const busy = useRef(false);
  const sequential = useRef(createSequentialFrames());
  const [fontsLoaded, onFontsLoaded] = useReducer((n: number) => n + 1, 0);

  const { width, height } = project.canvas;
  const safeZone = PLATFORMS[project.platform].safeZone;
  const isEmpty = project.tracks.every((t) => t.clips.length === 0);
  const selectedClip = selectedClipId ? findClip(project, selectedClipId)?.clip : undefined;
  const cropClip = panel === "crop" && selectedClip?.type === "media" ? selectedClip : undefined;

  const closeStreams = useCallback(() => sequential.current.close(), []);

  useEffect(() => {
    if (!playing) closeStreams();
  }, [playing, closeStreams]);
  useEffect(() => closeStreams, [closeStreams]);

  useEffect(() => {
    document.fonts.addEventListener("loadingdone", onFontsLoaded);
    return () => document.fonts.removeEventListener("loadingdone", onFontsLoaded);
  }, []);

  // Scrubbing uses random access; playback decodes forwards with one stream per clip.
  const frames = useCallback<FrameProvider>(
    (clip, seconds) =>
      useEditor.getState().playing ? sequential.current.frames(clip, seconds) : getFrame(clip.assetId, seconds),
    [],
  );

  // Latest-state-wins: while a frame renders, further changes just mark it dirty.
  useEffect(() => {
    dirty.current = true;
    if (busy.current) return;
    busy.current = true;
    void (async () => {
      try {
        while (dirty.current && canvasRef.current) {
          dirty.current = false;
          const s = useEditor.getState();
          const ctx = canvasRef.current.getContext("2d");
          if (!ctx) break;
          await ensureFontsLoaded(visibleTextClips(s.project, s.playhead).map((c) => c.style));
          const selected = s.selectedClipId ? findClip(s.project, s.selectedClipId)?.clip : undefined;
          // A template being browsed is drawn over the project, at the moment all its lines are up.
          // (Read from the store, not the closure: it may have changed while this loop was waiting.)
          const shown = s.templatePreview;
          const extraTextClips = shown
            ? visibleAt(
                await templateClipsAt(shown.template, s.playhead, s.project.canvas, shown.lookPreset),
                s.playhead + templateShowcaseOffset(shown.template),
              )
            : undefined;
          // The preview changed while fonts loaded: draw the new one instead.
          if (useEditor.getState().templatePreview !== shown) dirty.current = true;
          await composeFrame(ctx, s.project, s.playhead, frames, {
            fonts: fontFamilyFor,
            // Show the text being edited fully, not mid-animation.
            staticClipId: !s.playing && selected?.type === "text" ? selected.id : null,
            cropEditClipId: !s.playing && s.panel === "crop" && selected?.type === "media" ? selected.id : null,
            extraTextClips,
          });
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [playhead, project, playing, selectedClipId, panel, fontsLoaded, frames, templatePreview]);

  return (
    <div className="flex h-full w-full items-center justify-center" style={{ containerType: "size" }}>
      <div
        className="relative overflow-hidden rounded-xl bg-black shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.08]"
        style={{ aspectRatio: `${width} / ${height}`, width: `min(100cqw, calc(100cqh * ${width / height}))` }}
      >
        <canvas ref={canvasRef} data-preview width={width} height={height} className="h-full w-full" />
        {showSafeZone && safeZone && !isEmpty && !playing && !cropClip && (
          <SafeZoneOverlay zone={safeZone} label={PLATFORMS[project.platform].label} />
        )}
        {cropClip ? <CropOverlay clip={cropClip} /> : !isEmpty && <CanvasOverlay />}
        {isEmpty && !templatePreview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <button
              type="button"
              onClick={onImport}
              className="group flex flex-col items-center gap-3 text-neutral-200 transition-colors hover:text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-white text-neutral-950 shadow-[0_10px_30px_-8px_rgba(255,255,255,0.35)] transition-transform group-active:scale-95">
                <Plus className="size-7" />
              </span>
              <span className="text-sm font-semibold">Add videos & photos</span>
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onAddText}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06]"
              >
                <Type className="size-3.5" /> Start with text
              </button>
              <button
                type="button"
                onClick={onTemplates}
                className="flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1.5 text-xs text-gold-soft hover:bg-gold/10"
              >
                <LayoutTemplate className="size-3.5" /> Templates
              </button>
            </div>
            <p className="max-w-[16rem] text-xs text-neutral-500">
              Everything stays on your device. <span className="hidden md:inline">You can also drag files here.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
