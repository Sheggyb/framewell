"use client";

import {
  AudioWaveform,
  Blend,
  Captions,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Crop,
  Download,
  Frame,
  Frame as FrameIcon,
  Gauge,
  History,
  Keyboard,
  Layers,
  LoaderCircle,
  Magnet,
  Maximize,
  Mic,
  Music,
  Palette,
  PanelBottomClose,
  PanelBottomOpen,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  Scissors,
  Shapes,
  Sparkles,
  Sticker,
  SunMedium,
  Trash,
  Type,
  Undo2,
  Upload,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
  Focus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { audioElapsed, installAudioUnlock, startAudio, stopAudio } from "@/engine/audio/player";
import { detectCapabilities, type Capabilities } from "@/engine/capabilities";
import { findClip, projectDuration, setMainMagnet, setPlatform } from "@/engine/model/ops";
import { PLATFORM_ORDER, PLATFORMS, type PlatformId } from "@/engine/model/platforms";
import type { MediaClip, TextClip } from "@/engine/model/project";
import { formatTimecode } from "@/engine/model/time";
import { cn } from "@/lib/utils";
import {
  addText,
  duplicateSelected,
  importFiles,
  requestDeleteSelected,
  splitAtPlayhead,
  toMain,
  toOverlay,
} from "@/store/actions";
import { useEditor, type Panel, type TextTool } from "@/store/editor";
import { AppModeButton } from "./AppMode";
import { BeatsPanel } from "./BeatsPanel";
import { CaptionsPanel } from "./CaptionsPanel";
import { ColorPanel } from "./ColorPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { CropPanel, FramePanel } from "./CropPanel";
import { ExportDialog } from "./ExportDialog";
import { ProjectSheet } from "./ProjectSheet";
import { MediaPanel } from "./MediaPanel";
import { MiniTimeline } from "./MiniTimeline";
import { Preview } from "./Preview";
import { HistorySheet, ShortcutsSheet, ToastHost } from "./Sheets";
import { useShortcuts } from "./shortcuts";
import { SpeedPanel } from "./SpeedPanel";
import { StickersPanel } from "./StickersPanel";
import { TextPanel } from "./TextPanel";
import { Timeline } from "./Timeline";
import { TransitionPanel } from "./TransitionPanel";
import { useProjectPersistence } from "./useProjectPersistence";
import { VoiceoverPanel } from "./VoiceoverPanel";
import { ZoomPanel } from "./ZoomPanel";

const ACCEPT_ALL = "video/*,audio/*,image/*,.mov,.m4a";
const ACCEPT_AUDIO = "audio/*,.m4a";
const COLLAPSED_KEY = "framewell:timeline-collapsed";
const DESKTOP_QUERY = "(min-width: 768px)";

/** True on tablet/desktop widths, where panels open in a side column. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/**
 * App-like behaviour while editing: no pull-to-refresh or page bounce, and the timeline
 * collapsed/expanded state is remembered on this device.
 */
function useAppFeel() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("overscroll-none");
    try {
      useEditor.getState().setTimelineCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Storage unavailable (private mode): default to expanded.
    }
    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.timelineCollapsed === prev.timelineCollapsed) return;
      try {
        localStorage.setItem(COLLAPSED_KEY, s.timelineCollapsed ? "1" : "0");
      } catch {
        // Not critical.
      }
    });
    return () => {
      html.classList.remove("overscroll-none");
      unsubscribe();
    };
  }, []);
}

/**
 * Advances the playhead while playing and plays the project's audio. The audio clock
 * drives the playhead when sound is running, so picture and sound stay in sync.
 */
function usePlaybackClock() {
  const playing = useEditor((s) => s.playing);
  useEffect(() => installAudioUnlock(), []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const startWall = performance.now();
    const startT = useEditor.getState().playhead;
    const withAudio = startAudio(useEditor.getState().project, startT);
    const tick = (now: number) => {
      const s = useEditor.getState();
      const elapsed = (withAudio ? audioElapsed() : null) ?? (now - startWall) / 1000;
      const t = startT + elapsed * 1_000_000;
      const end = s.playUntil ?? projectDuration(s.project);
      if (t >= end) {
        s.setPlayhead(s.playReturnTo ?? end);
        s.pause();
        return;
      }
      s.setPlayhead(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopAudio();
    };
  }, [playing]);
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  hint,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  /** Keyboard shortcut, shown in the tooltip. */
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint ? `${label} (${hint})` : label}
      className={cn(
        "relative flex min-w-14 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-white active:bg-white/[0.06] disabled:opacity-30 md:max-w-24",
        active && "text-gold after:absolute after:bottom-0 after:h-0.5 after:w-4 after:rounded-full after:bg-gold",
      )}
    >
      <span className="[&_svg]:size-5">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent [&_svg]:size-[18px]",
        active && "bg-gold/15 text-gold",
        className,
      )}
    >
      {children}
    </button>
  );
}

const TEXT_TOOLS: [TextTool, string, ReactNode][] = [
  ["edit", "Edit", <Pencil key="edit" />],
  ["style", "Styles", <Shapes key="style" />],
  ["font", "Font", <CaseSensitive key="font" />],
  ["color", "Color", <Palette key="color" />],
  ["animate", "Animate", <Sparkles key="animate" />],
];

/** The open tool panel for the current selection, or null. */
function ActivePanel({ panel, text, media }: { panel: Panel | null; text?: TextClip; media?: MediaClip }) {
  if (!panel) return null;
  if (panel === "captions") return <CaptionsPanel />;
  if (panel === "stickers") return <StickersPanel />;
  if (panel === "voiceover") return <VoiceoverPanel />;
  if (panel === "beats") return <BeatsPanel />;
  if (text) return <TextPanel clip={text} />;
  if (!media) return null;
  switch (panel) {
    case "crop":
      return <CropPanel clip={media} />;
    case "frame":
      return <FramePanel clip={media} />;
    case "zoom":
      return <ZoomPanel clip={media} />;
    case "color":
      return <ColorPanel clip={media} />;
    case "speed":
      return <SpeedPanel clip={media} />;
    case "audio":
      return <MediaPanel clip={media} />;
    case "transition":
      return <TransitionPanel clip={media} />;
    default:
      return null;
  }
}

export default function Editor() {
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const playing = useEditor((s) => s.playing);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const panel = useEditor((s) => s.panel);
  const dialog = useEditor((s) => s.dialog);
  const canUndo = useEditor((s) => s.past.length > 0 || s.liveEdit !== null);
  const canRedo = useEditor((s) => s.future.length > 0);
  const showSafeZone = useEditor((s) => s.showSafeZone);
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const timelineCollapsed = useEditor((s) => s.timelineCollapsed);
  const { undo, redo, edit, toggleSafeZone, setZoom, togglePlay, openPanel, select, openDialog, zoomToFit } =
    useEditor.getState();

  const isDesktop = useIsDesktop();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const duration = projectDuration(project);
  const openExport = useCallback(() => {
    if (projectDuration(useEditor.getState().project) > 0) setExporting(true);
  }, [setExporting]);

  useShortcuts({ onExport: openExport });
  usePlaybackClock();
  useAppFeel();
  const persistence = useProjectPersistence();

  useEffect(() => {
    void detectCapabilities().then(setCaps);
  }, []);

  const openPicker = (accept: string) => {
    if (!fileInput.current) return;
    fileInput.current.accept = accept;
    fileInput.current.click();
  };

  const onFiles = async (files: File[]) => {
    if (!files.length) return;
    setErrors([]);
    setImporting({ done: 0, total: files.length });
    const problems = await importFiles(files, (done, total) => setImporting({ done, total }));
    setImporting(null);
    setErrors(problems);
    if (problems.length < files.length) {
      useEditor.getState().showToast(files.length - problems.length === 1 ? "Added" : `Added ${files.length - problems.length} files`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const fps = project.canvas.fps;
  const hasSafeZone = PLATFORMS[project.platform].safeZone !== null;
  const found = selectedClipId ? findClip(project, selectedClipId) : undefined;
  const selectedText = found?.clip.type === "text" ? found.clip : undefined;
  const selectedMedia = found?.clip.type === "media" ? found.clip : undefined;
  const selectedTrack = found?.track.kind;
  const onMainTrack = selectedTrack === "main";
  const isVisual = selectedMedia ? project.assets[selectedMedia.assetId]?.kind !== "audio" : false;
  const toggle = (tool: Panel) => openPanel(panel === tool ? null : tool);

  if (persistence.state === "loading") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-[#09090b] text-neutral-300">
        <LoaderCircle className="size-7 animate-spin text-gold" />
        <p className="text-sm">Opening project…</p>
      </div>
    );
  }

  if (caps?.tier === "unsupported") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#09090b] p-6 text-center text-neutral-200">
        <h1 className="text-lg font-semibold">
          {caps.secureContext ? "This browser can't run Framewell" : "Open Framewell over HTTPS"}
        </h1>
        <p className="max-w-sm text-sm text-neutral-400">{caps.reason}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const panelNode = <ActivePanel panel={panel} text={selectedText} media={selectedMedia} />;
  const hasPanel = panel !== null && (panel === "captions" || panel === "stickers" || panel === "voiceover" || panel === "beats" || Boolean(found));
  const timelineNode = timelineCollapsed ? <MiniTimeline /> : <Timeline />;

  const transport = (
    <div className="flex h-11 shrink-0 items-center gap-2 px-2 text-xs">
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause (Space)" : "Play (Space)"}
        onClick={togglePlay}
        disabled={duration === 0}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 shadow transition-transform active:scale-90 disabled:opacity-30 [&_svg]:size-4"
      >
        {playing ? <Pause className="fill-current" /> : <Play className="translate-x-px fill-current" />}
      </button>
      <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-neutral-200 sm:text-xs">
        {formatTimecode(playhead, fps)}
        <span className="text-neutral-500"> / {formatTimecode(duration, fps)}</span>
      </span>
      {importing && (
        <span className="flex items-center gap-1.5 text-neutral-400">
          <LoaderCircle className="size-4 animate-spin text-gold" />
          <span className="hidden sm:inline">
            Adding {importing.done + 1} of {importing.total}…
          </span>
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <select
          aria-label="Platform"
          title="Video shape"
          value={project.platform}
          onChange={(e) => {
            const platform = e.target.value as PlatformId;
            edit(`Platform: ${PLATFORMS[platform].label}`, (draft) => setPlatform(draft, platform));
            // Let the arrow keys go back to moving the playhead.
            e.currentTarget.blur();
          }}
          className="h-8 rounded-full border border-white/10 bg-white/[0.04] px-2 text-xs text-neutral-200"
        >
          {PLATFORM_ORDER.map((id) => (
            <option key={id} value={id}>
              {PLATFORMS[id].label}
            </option>
          ))}
        </select>
        <IconButton
          label={timelineCollapsed ? "Show timeline (H)" : "Hide timeline (H)"}
          onClick={() => useEditor.getState().setTimelineCollapsed(!timelineCollapsed)}
          active={timelineCollapsed}
        >
          {timelineCollapsed ? <PanelBottomOpen /> : <PanelBottomClose />}
        </IconButton>
        <IconButton
          label={project.mainMagnet ? "Magnet on: clips stick together" : "Magnet off: place clips freely"}
          onClick={() => edit(project.mainMagnet ? "Magnet off" : "Magnet on", (d) => setMainMagnet(d, !project.mainMagnet))}
          active={project.mainMagnet}
        >
          <Magnet />
        </IconButton>
        <IconButton label="Safe zone" onClick={toggleSafeZone} active={showSafeZone} disabled={!hasSafeZone}>
          <Frame />
        </IconButton>
        <span className="hidden items-center gap-1 md:flex">
          <IconButton label="Zoom out (−)" onClick={() => setZoom(pxPerSecond / 1.4)}>
            <ZoomOut />
          </IconButton>
          <IconButton label="Fit whole video (0)" onClick={zoomToFit}>
            <Maximize />
          </IconButton>
          <IconButton label="Zoom in (+)" onClick={() => setZoom(pxPerSecond * 1.4)}>
            <ZoomIn />
          </IconButton>
        </span>
      </div>
    </div>
  );

  const toolbar = (
    <nav className="flex shrink-0 items-start justify-start gap-0.5 overflow-x-auto border-t border-white/[0.06] bg-[#09090b] px-2 pt-1.5 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-14px))] [scrollbar-width:none] md:justify-center">
      {selectedText ? (
        <>
          <ToolButton icon={<ChevronLeft />} label="Back" hint="Esc" onClick={() => select(null)} />
          {TEXT_TOOLS.map(([tool, label, icon]) => (
            <ToolButton key={tool} icon={icon} label={label} active={panel === tool} onClick={() => toggle(tool)} />
          ))}
          <ToolButton icon={<Scissors />} label="Split" hint="S" onClick={splitAtPlayhead} />
          <ToolButton icon={<Copy />} label="Copy" hint="Ctrl+D" onClick={duplicateSelected} />
          <ToolButton icon={<Trash />} label="Delete" hint="Del" onClick={requestDeleteSelected} />
        </>
      ) : selectedMedia ? (
        <>
          <ToolButton icon={<ChevronLeft />} label="Back" hint="Esc" onClick={() => select(null)} />
          {isVisual && (
            <>
              <ToolButton icon={<Crop />} label="Crop" active={panel === "crop"} onClick={() => toggle("crop")} />
              <ToolButton icon={<FrameIcon />} label="Frame" active={panel === "frame"} onClick={() => toggle("frame")} />
              <ToolButton icon={<Focus />} label="Zoom" active={panel === "zoom"} onClick={() => toggle("zoom")} />
              <ToolButton icon={<SunMedium />} label="Color" active={panel === "color"} onClick={() => toggle("color")} />
            </>
          )}
          <ToolButton icon={<Gauge />} label="Speed" active={panel === "speed"} onClick={() => toggle("speed")} />
          <ToolButton icon={<Volume2 />} label="Audio" active={panel === "audio"} onClick={() => toggle("audio")} />
          {onMainTrack && (
            <ToolButton icon={<Blend />} label="Transition" active={panel === "transition"} onClick={() => toggle("transition")} />
          )}
          {isVisual && (selectedTrack === "main" || selectedTrack === "overlay") && (
            <ToolButton
              icon={<Layers />}
              label={onMainTrack ? "Overlay" : "To main"}
              onClick={() => (onMainTrack ? toOverlay() : toMain())}
            />
          )}
          <ToolButton icon={<Scissors />} label="Split" hint="S" onClick={splitAtPlayhead} />
          <ToolButton icon={<Copy />} label="Copy" hint="Ctrl+D" onClick={duplicateSelected} />
          <ToolButton icon={<Trash />} label="Delete" hint="Del" onClick={requestDeleteSelected} />
        </>
      ) : (
        <>
          <ToolButton icon={<Plus />} label="Add" onClick={() => openPicker(ACCEPT_ALL)} disabled={Boolean(importing)} />
          <ToolButton icon={<Type />} label="Text" hint="T" onClick={() => addText()} />
          <ToolButton icon={<Captions />} label="Captions" active={panel === "captions"} onClick={() => toggle("captions")} />
          <ToolButton icon={<Sticker />} label="Stickers" active={panel === "stickers"} onClick={() => toggle("stickers")} />
          <ToolButton icon={<Music />} label="Music" onClick={() => openPicker(ACCEPT_AUDIO)} disabled={Boolean(importing)} />
          <ToolButton icon={<Mic />} label="Voice" active={panel === "voiceover"} onClick={() => toggle("voiceover")} />
          <ToolButton icon={<AudioWaveform />} label="Beats" hint="M" active={panel === "beats"} onClick={() => toggle("beats")} />
          <ToolButton icon={<Scissors />} label="Split" hint="S" onClick={splitAtPlayhead} disabled={duration === 0} />
        </>
      )}
    </nav>
  );

  return (
    // touch-manipulation: no double-tap zoom anywhere in the editor.
    <div
      className="relative flex h-dvh touch-manipulation flex-col overflow-hidden pt-safe bg-[#09090b] text-neutral-100"
      // After a click, give keyboard focus back to the page, so Space and the arrow keys
      // control playback instead of re-pressing the button or moving the slider.
      onPointerUpCapture={(e) => {
        const el = (e.target as HTMLElement).closest("button, input[type=range]");
        if (el) setTimeout(() => (el as HTMLElement).blur(), 0);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDropping(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        void onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void onFiles(Array.from(e.currentTarget.files ?? []))}
      />

      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-1 px-2">
        <Link
          href="/"
          aria-label="Back to projects"
          title="Back to projects (your work is saved)"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 active:bg-white/15"
        >
          <ChevronLeft className="size-6" />
        </Link>
        {/* The project: tap for name, video shape, backup and history. */}
        <button
          type="button"
          onClick={() => openDialog("project")}
          title="Project: rename, video shape, backup"
          className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] pr-2 pl-3 text-left transition-colors hover:bg-white/[0.07] active:bg-white/10"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight text-neutral-100">{project.name}</span>
            <span className="flex items-center gap-1 text-[10px] leading-tight text-neutral-500">
              {persistence.savedAt && <Check className="size-3 shrink-0 text-emerald-400" />}
              <span className="truncate">{persistence.savedAt ? "Saved" : "Not saved yet"} · {PLATFORMS[project.platform].label}</span>
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconButton label="Keyboard shortcuts (?)" onClick={() => openDialog("shortcuts")} className="hidden md:flex">
            <Keyboard />
          </IconButton>
          <AppModeButton />
          {/* On phones, History lives in the project sheet to keep the top bar roomy. */}
          <IconButton label="History" onClick={() => openDialog("history")} disabled={!canUndo && !canRedo} className="hidden md:flex">
            <History />
          </IconButton>
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} className="size-10 md:size-9">
            <Undo2 />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} className="size-10 md:size-9">
            <Redo2 />
          </IconButton>
          <button
            type="button"
            disabled={duration === 0}
            onClick={openExport}
            title="Export (Ctrl+E)"
            className="ml-1 flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 sm:px-4 text-sm font-semibold text-neutral-950 shadow-[0_4px_20px_-6px_rgba(255,255,255,0.4)] transition-transform active:scale-95 disabled:opacity-40 md:h-9"
          >
            <Download className="hidden size-4 sm:block" />
            Export
          </button>
        </div>
      </header>

      {/* Workspace: on desktop the tool panel sits beside the preview; on phones it replaces the timeline. */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 px-3 py-2">
            <Preview onImport={() => openPicker(ACCEPT_ALL)} onAddText={() => addText()} />
          </main>
          {transport}
        </div>
        {isDesktop && hasPanel && (
          <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-[#111114]">{panelNode}</aside>
        )}
      </div>

      {persistence.warning && (
        <div role="status" className="mx-3 mb-2 rounded-md bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
          {persistence.warning}
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="mx-3 mb-2 flex items-start gap-2 rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">
          <div className="flex-1">
            {errors.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setErrors([])} className="text-red-200">
            <X className="size-4" />
          </button>
        </div>
      )}

      {isDesktop ? timelineNode : hasPanel ? panelNode : timelineNode}
      {toolbar}

      {dropping && (
        <div className="pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/70 bg-black/70 text-gold backdrop-blur-sm">
          <Upload className="size-8" />
          <p className="text-sm font-semibold">Drop videos, photos or music to add them</p>
        </div>
      )}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
      {dialog === "history" && <HistorySheet />}
      {dialog === "shortcuts" && <ShortcutsSheet />}
      {dialog === "project" && <ProjectSheet savedAt={persistence.savedAt} isDesktop={isDesktop} />}
      <ToastHost />
      <ConfirmDialog />
    </div>
  );
}
