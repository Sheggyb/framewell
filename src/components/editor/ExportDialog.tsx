"use client";

import { Download, LoaderCircle, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ExportError,
  exportProject,
  outputSize,
  type ExportFps,
  type ExportResolution,
  type ExportResult,
} from "@/engine/export/exportVideo";
import { usToSeconds } from "@/engine/model/time";
import { projectDuration } from "@/engine/model/ops";
import { ensureFontsLoaded, fontFamilyFor } from "@/lib/fonts";
import { useEditor } from "@/store/editor";
import { Chip, Section } from "./controls";
import { useBackHandler } from "./useBackButton";

type Phase =
  | { kind: "settings" }
  | { kind: "running"; progress: number; secondsLeft: number | null }
  | { kind: "done"; result: ExportResult; url: string }
  | { kind: "error"; message: string };

const formatSize = (bytes: number) =>
  bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;

/** Keeps the screen on during export; phones otherwise sleep and the tab gets suspended. */
async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    return (await navigator.wakeLock?.request("screen")) ?? null;
  } catch {
    return null;
  }
}

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project);
  const [resolution, setResolution] = useState<ExportResolution>(1080);
  const [fps, setFps] = useState<ExportFps>(30);
  const [phase, setPhase] = useState<Phase>({ kind: "settings" });
  const abort = useRef<AbortController | null>(null);
  const started = useRef(0);

  const size = outputSize(project, resolution);
  const seconds = usToSeconds(projectDuration(project));

  // Free the exported file when the dialog closes.
  const url = phase.kind === "done" ? phase.url : null;
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  useEffect(() => () => abort.current?.abort(), []);

  const running = phase.kind === "running";
  // Back / Escape close the dialog, but never interrupt a running export (Cancel does that).
  useBackHandler(() => {
    if (!running) onClose();
    return true;
  });
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const start = async () => {
    useEditor.getState().pause();
    const controller = new AbortController();
    abort.current = controller;
    started.current = performance.now();
    setPhase({ kind: "running", progress: 0, secondsLeft: null });
    let wakeLock = await requestWakeLock();
    // Phones drop the wake lock whenever the page is hidden; take it again on return.
    const onVisible = async () => {
      if (document.visibilityState !== "visible" || controller.signal.aborted) return;
      if (!wakeLock || wakeLock.released) wakeLock = await requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    try {
      const result = await exportProject(useEditor.getState().project, {
        resolution,
        fps,
        fonts: fontFamilyFor,
        ensureFonts: ensureFontsLoaded,
        signal: controller.signal,
        onProgress: (progress) => {
          const elapsed = (performance.now() - started.current) / 1000;
          const secondsLeft = progress > 0.03 ? elapsed / progress - elapsed : null;
          setPhase({ kind: "running", progress, secondsLeft });
        },
      });
      setPhase({ kind: "done", result, url: URL.createObjectURL(result.blob) });
    } catch (err) {
      if (controller.signal.aborted) setPhase({ kind: "settings" });
      else {
        console.error(err);
        setPhase({
          kind: "error",
          message: err instanceof ExportError ? err.message : "Something went wrong while exporting. Please try again.",
        });
      }
    } finally {
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLock?.release();
    }
  };

  const share = async (result: ExportResult) => {
    const file = new File([result.blob], result.fileName, { type: result.blob.type });
    try {
      await navigator.share({ files: [file] });
    } catch {
      // The user closed the share sheet.
    }
  };

  const canShareFiles =
    phase.kind === "done" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], phase.result.fileName, { type: phase.result.blob.type })] });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export video"
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-2xl bg-neutral-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Export video</h2>
          {!running && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-300"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {phase.kind === "settings" && (
          <>
            <Section title="Quality">
              <div className="flex gap-2">
                {([720, 1080] as const).map((r) => (
                  <Chip key={r} active={resolution === r} onClick={() => setResolution(r)} className="flex-1">
                    {r}p
                  </Chip>
                ))}
              </div>
            </Section>
            <Section title="Frame rate">
              <div className="flex gap-2">
                {([24, 30, 60] as const).map((f) => (
                  <Chip key={f} active={fps === f} onClick={() => setFps(f)} className="flex-1">
                    {f} fps
                  </Chip>
                ))}
              </div>
            </Section>
            <p className="text-xs text-neutral-400">
              {size.width}×{size.height} · {seconds.toFixed(1)}s · no watermark. Your video is made on this device and
              never uploaded.
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={seconds === 0}
              className="h-12 rounded-xl bg-white text-sm font-semibold text-neutral-950 disabled:opacity-40"
            >
              Export
            </button>
          </>
        )}

        {phase.kind === "running" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm">
              <LoaderCircle className="size-5 animate-spin text-gold" />
              <span className="font-medium">Exporting… {Math.floor(phase.progress * 100)}%</span>
              {phase.secondsLeft !== null && (
                <span className="ml-auto text-xs text-neutral-400">about {Math.ceil(phase.secondsLeft)}s left</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-gold-deep to-gold transition-[width]" style={{ width: `${phase.progress * 100}%` }} />
            </div>
            <p className="text-xs text-neutral-400">Keep this screen open until it finishes.</p>
            <button
              type="button"
              onClick={() => abort.current?.abort()}
              className="h-11 rounded-xl bg-white/10 text-sm font-medium text-neutral-200"
            >
              Cancel
            </button>
          </div>
        )}

        {phase.kind === "done" && (
          <div className="flex flex-col gap-4">
            <video
              src={phase.url}
              controls
              playsInline
              className="max-h-[45dvh] w-full rounded-lg bg-black object-contain"
            />
            <p className="text-xs text-neutral-400">
              {phase.result.width}×{phase.result.height} · {phase.result.seconds.toFixed(1)}s ·{" "}
              {formatSize(phase.result.blob.size)}
            </p>
            {phase.result.warnings.map((w) => (
              <p key={w} role="alert" className="rounded-md bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
                {w}
              </p>
            ))}
            {canShareFiles && (
              <button
                type="button"
                onClick={() => void share(phase.result)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950"
              >
                <Share className="size-4" /> Save or share
              </button>
            )}
            <a
              href={phase.url}
              download={phase.result.fileName}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-medium text-neutral-100"
            >
              <Download className="size-4" /> Download
            </a>
          </div>
        )}

        {phase.kind === "error" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{phase.message}</p>
            <button
              type="button"
              onClick={() => setPhase({ kind: "settings" })}
              className="h-11 rounded-xl bg-white/10 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
