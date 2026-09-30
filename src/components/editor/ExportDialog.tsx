"use client";

import { CircleAlert, CircleCheck, Download, LoaderCircle, Minimize2, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  canExportAt,
  ExportError,
  exportProject,
  outputSize,
  type ExportErrorCode,
  type ExportFps,
  type ExportResolution,
  type ExportResult,
} from "@/engine/export/exportVideo";
import { usToSeconds } from "@/engine/model/time";
import { projectDuration } from "@/engine/model/ops";
import { useT } from "@/i18n";
import { ensureFontsLoaded, fontFamilyFor } from "@/lib/fonts";
import { useEditor } from "@/store/editor";
import { Chip, Section } from "./controls";
import { hideSupport, SUPPORT_URL, supportHidden } from "@/lib/support";
import { useBackHandler } from "./useBackButton";

type Phase =
  | { kind: "settings" }
  | { kind: "running"; progress: number; secondsLeft: number | null }
  | { kind: "done"; result: ExportResult; url: string }
  | { kind: "error"; code: ExportErrorCode | "failed"; params: Record<string, string | number> };

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

/** Sizes offered: phones stop at 1080p (memory); computers also get 1440p and 4K where they can encode them. */
const PHONE_SIZES: ExportResolution[] = [720, 1080];
const DESKTOP_SIZES: ExportResolution[] = [720, 1080, 1440, 2160];

/**
 * Export settings, progress and the finished video. `advanced` (the desktop studio) adds 1440p
 * and 4K, and "Keep editing", which shrinks a running export into a corner pill so you can go on
 * editing; the export works from a snapshot of the project taken when it started.
 */
export function ExportDialog({ onClose, advanced = false }: { onClose: () => void; advanced?: boolean }) {
  const t = useT();
  const project = useEditor((s) => s.project);
  const [resolution, setResolution] = useState<ExportResolution>(1080);
  const [fps, setFps] = useState<ExportFps>(30);
  const [phase, setPhase] = useState<Phase>({ kind: "settings" });
  const [minimized, setMinimized] = useState(false);
  const [supported, setSupported] = useState<Partial<Record<ExportResolution, boolean>>>({});
  const sizes = advanced ? DESKTOP_SIZES : PHONE_SIZES;

  // Which of the big sizes this computer can actually encode (asked once, when the dialog opens).
  useEffect(() => {
    if (!advanced) return;
    let alive = true;
    const current = useEditor.getState().project;
    void Promise.all(([1440, 2160] as const).map(async (r) => [r, await canExportAt(current, r)] as const)).then((pairs) => {
      if (alive) setSupported(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [advanced]);
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
  // While shrunk to the corner pill, Back belongs to the editor again.
  useBackHandler(() => {
    if (!running) onClose();
    return true;
  }, !minimized);
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
      if (controller.signal.aborted) {
        setPhase({ kind: "settings" });
        setMinimized(false);
      }
      else {
        console.error(err);
        setPhase(
          err instanceof ExportError
            ? { kind: "error", code: err.code, params: err.params }
            : { kind: "error", code: "failed", params: {} },
        );
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

  if (minimized) {
    const percent = phase.kind === "running" ? Math.floor(phase.progress * 100) : 100;
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed end-4 bottom-4 z-40 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1f]/95 py-2.5 ps-3 pe-4 text-start text-sm shadow-2xl backdrop-blur animate-[fw-rise_0.25s_ease-out]"
      >
        {phase.kind === "running" && (
          <span className="relative flex size-9 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 94.2} 94.2`}
              />
            </svg>
            <span className="text-[10px] font-semibold tabular-nums">{percent}</span>
          </span>
        )}
        {phase.kind === "done" && <CircleCheck className="size-6 text-emerald-400" />}
        {phase.kind === "error" && <CircleAlert className="size-6 text-red-300" />}
        <span className="flex flex-col">
          <span className="font-medium text-neutral-100">
            {phase.kind === "running"
              ? t("editor.export.pillRunning", { percent: String(percent) })
              : phase.kind === "done"
                ? t("editor.export.pillDone")
                : t("editor.export.pillError")}
          </span>
          {phase.kind !== "running" && <span className="text-xs text-gold">{t("editor.export.pillOpen")}</span>}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("editor.export.title")}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-2xl bg-neutral-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("editor.export.title")}</h2>
          {!running && (
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-300"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {phase.kind === "settings" && (
          <>
            <Section title={t("editor.export.quality")}>
              <div className="flex gap-2">
                {sizes.map((r) => (
                  <Chip
                    key={r}
                    active={resolution === r}
                    onClick={() => setResolution(r)}
                    disabled={supported[r] === false}
                    title={supported[r] === false ? t("editor.export.notSupported") : undefined}
                    className="flex-1"
                  >
                    {r === 2160 ? t("editor.export.uhd") : `${r}p`}
                  </Chip>
                ))}
              </div>
            </Section>
            <Section title={t("editor.export.frameRate")}>
              <div className="flex gap-2">
                {([24, 30, 60] as const).map((f) => (
                  <Chip key={f} active={fps === f} onClick={() => setFps(f)} className="flex-1">
                    {t("editor.export.fps", { fps: String(f) })}
                  </Chip>
                ))}
              </div>
            </Section>
            <p className="text-xs text-neutral-400">
              {t("editor.export.summary", { width: String(size.width), height: String(size.height), seconds: seconds.toFixed(1) })}
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={seconds === 0}
              className="h-12 rounded-xl bg-white text-sm font-semibold text-neutral-950 disabled:opacity-40"
            >
              {t("editor.export.start")}
            </button>
          </>
        )}

        {phase.kind === "running" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm">
              <LoaderCircle className="size-5 animate-spin text-gold" />
              <span className="font-medium">{t("editor.export.progress", { percent: String(Math.floor(phase.progress * 100)) })}</span>
              {phase.secondsLeft !== null && (
                <span className="ms-auto text-xs text-neutral-400">{t("editor.export.timeLeft", { seconds: String(Math.ceil(phase.secondsLeft)) })}</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-gold-deep to-gold transition-[width]" style={{ width: `${phase.progress * 100}%` }} />
            </div>
            <p className="text-xs text-neutral-400">{advanced ? t("editor.export.backgroundHint") : t("editor.export.keepOpen")}</p>
            <div className="flex gap-2">
              {advanced && (
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950"
                >
                  <Minimize2 className="size-4" /> {t("editor.export.keepEditing")}
                </button>
              )}
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                className="h-11 flex-1 rounded-xl bg-white/10 text-sm font-medium text-neutral-200"
              >
                {t("common.cancel")}
              </button>
            </div>
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
              {t("editor.export.resultInfo", {
                width: String(phase.result.width),
                height: String(phase.result.height),
                seconds: phase.result.seconds.toFixed(1),
                size: formatSize(phase.result.blob.size),
              })}
            </p>
            {phase.result.warnings.map((w) => (
              <p key={w.code} role="alert" className="rounded-md bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
                {t(`errors.export.${w.code}`)}
              </p>
            ))}
            {canShareFiles && (
              <button
                type="button"
                onClick={() => void share(phase.result)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950"
              >
                <Share className="size-4" /> {t("editor.export.share")}
              </button>
            )}
            <a
              href={phase.url}
              download={phase.result.fileName}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-medium text-neutral-100"
            >
              <Download className="size-4" /> {t("editor.export.download")}
            </a>
            <SupportLine />
          </div>
        )}

        {phase.kind === "error" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{t(`errors.export.${phase.code}`, phase.params)}</p>
            <button
              type="button"
              onClick={() => setPhase({ kind: "settings" })}
              className="h-11 rounded-xl bg-white/10 text-sm font-medium"
            >
              {t("common.retry")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One quiet line after a finished export, the moment creators are happiest. Never shown again once hidden. */
function SupportLine() {
  const t = useT();
  const [hidden, setHidden] = useState(supportHidden);
  if (hidden) return null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs text-neutral-500">
      {t("editor.export.supportLine")}
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-gold hover:underline">
        {t("editor.export.supportLink")}
      </a>
      <button
        type="button"
        onClick={() => {
          hideSupport();
          setHidden(true);
        }}
        className="text-neutral-600 underline-offset-2 hover:text-neutral-400 hover:underline"
      >
        {t("editor.export.supportHide")}
      </button>
    </p>
  );
}
