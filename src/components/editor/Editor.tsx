"use client";

import {
  ALargeSmall,
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
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  ChevronsLeft,
  ChevronsRight,
  Diamond,
  ArrowLeftToLine,
  ArrowRightToLine,
  Fullscreen,
  Minimize,
  Grid2x2Check,
  Focus,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { audioElapsed, audioPending, installAudioUnlock, setUserMuted, startAudio, stopAudio } from "@/engine/audio/player";
import { audioReadyVersion, onAudioReady } from "@/engine/media/registry";
import { detectCapabilities, type Capabilities } from "@/engine/capabilities";
import { findClip, projectDuration, setMainMagnet, setPlatform } from "@/engine/model/ops";
import { PLATFORM_ORDER, PLATFORMS, type PlatformId } from "@/engine/model/platforms";
import type { MediaClip, TextClip } from "@/engine/model/project";
import { formatTimecode } from "@/engine/model/time";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  addBeatAtPlayhead,
  addText,
  confirmDraftText,
  duplicateSelected,
  importFiles,
  type ImportPlacement,
  jumpTo,
  jumpToEditPoint,
  requestDeleteSelected,
  splitAtPlayhead,
  stepFrames,
  trimAtPlayhead,
  toMain,
  toOverlay,
} from "@/store/actions";
import { useEditor, type Panel } from "@/store/editor";
import { AppModeButton } from "./AppMode";
import { BeatsPanel } from "./BeatsPanel";
import { CaptionsPanel } from "./CaptionsPanel";
import { ColorPanel } from "./ColorPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { ContextMenu } from "./ContextMenu";
import { CropPanel, FramePanel } from "./CropPanel";
import { ExportDialog } from "./ExportDialog";
import { ProjectSheet } from "./ProjectSheet";
import { MediaPanel } from "./MediaPanel";
import { MiniTimeline } from "./MiniTimeline";
import { Preview } from "./Preview";
import { PageTitle } from "../i18n/PageTitle";
import { HistorySheet, ShortcutsSheet, ToastHost } from "./Sheets";
import { useShortcuts } from "./shortcuts";
import { MAX_PX_PER_SECOND, MIN_PX_PER_SECOND } from "@/store/editor";
import {
  StudioInspector,
  StudioProjectPanel,
  setPreviewColumn,
  togglePreviewFullscreen,
  StudioRail,
  StudioSidePanel,
  TimelineResizer,
  useIsStudio,
  useStudioTimelineHeight,
  type RailTool,
} from "./Studio";
import { SpeedPanel } from "./SpeedPanel";
import { StickersPanel } from "./StickersPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { TextPanel } from "./TextPanel";
import { DialRow, ToolDial, useToolbarStyle, type DialTool } from "./ToolDial";
import { isTextPicker, TextPicker } from "./TextPicker";
import { DROP_FILES_EVENT, Timeline } from "./Timeline";
import { TransitionPanel } from "./TransitionPanel";
import { leaveEditor, useBackButton } from "./useBackButton";
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
    let startWall = performance.now();
    let startT = useEditor.getState().playhead;
    let withAudio = startAudio(useEditor.getState().project, startT);
    // Sound that finishes preparing mid-playback (a clip just added) joins in from here,
    // instead of staying silent until the next Play.
    const unsubscribe = onAudioReady(() => {
      startT = useEditor.getState().playhead;
      startWall = performance.now();
      withAudio = startAudio(useEditor.getState().project, startT);
    });
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
      unsubscribe();
      stopAudio();
    };
  }, [playing]);
}

const SOUND_OFF_KEY = "framewell:sound-off";

/**
 * Sound on/off for the editor preview (exports always keep their sound), remembered on this
 * device. Spins while a just-added clip's sound is still being prepared.
 */
function SoundButton() {
  const t = useT();
  const project = useEditor((s) => s.project);
  // Re-render when some clip's sound finishes preparing.
  useSyncExternalStore(onAudioReady, audioReadyVersion, audioReadyVersion);
  const [off, setOff] = useState(() => {
    try {
      return localStorage.getItem(SOUND_OFF_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => setUserMuted(off), [off]);
  const pending = audioPending(project);

  const toggle = () => {
    const next = !off;
    setOff(next);
    try {
      localStorage.setItem(SOUND_OFF_KEY, next ? "1" : "0");
    } catch {
      // Not remembered; still applies now.
    }
    useEditor.getState().showToast(next ? t("editor.toasts.soundOff") : t("editor.toasts.soundOn"));
  };

  return (
    <IconButton
      label={pending ? t("editor.transport.soundPreparing") : off ? t("editor.transport.soundOff") : t("editor.transport.soundOn")}
      onClick={toggle}
      active={off}
    >
      {pending ? <LoaderCircle className="animate-spin text-gold" /> : off ? <VolumeX /> : <Volume2 />}
    </IconButton>
  );
}

/** The running time. Its own component, so playback re-renders only this, not the whole editor. */
function PlayheadTime({ fps }: { fps: number }) {
  const playhead = useEditor((s) => s.playhead);
  return <>{formatTimecode(playhead, fps)}</>;
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

/** The open tool panel for the current selection, or null. */
function ActivePanel({ panel, text, media }: { panel: Panel | null; text?: TextClip; media?: MediaClip }) {
  if (!panel) return null;
  if (panel === "captions") return <CaptionsPanel />;
  if (panel === "stickers") return <StickersPanel />;
  if (panel === "voiceover") return <VoiceoverPanel />;
  if (panel === "beats") return <BeatsPanel />;
  if (panel === "templates") return <TemplatesPanel />;
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
  const t = useT();
  const project = useEditor((s) => s.project);
  const playing = useEditor((s) => s.playing);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const panel = useEditor((s) => s.panel);
  const dialog = useEditor((s) => s.dialog);
  const canUndo = useEditor((s) => s.past.length > 0 || s.liveEdit !== null);
  const canRedo = useEditor((s) => s.future.length > 0);
  const showSafeZone = useEditor((s) => s.showSafeZone);
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const timelineCollapsed = useEditor((s) => s.timelineCollapsed);
  const moreOpen = useEditor((s) => s.moreOpen);
  const draftText = useEditor((s) => s.draftText);
  const { undo, redo, edit, toggleSafeZone, setZoom, togglePlay, openPanel, select, openDialog, zoomToFit } =
    useEditor.getState();

  const router = useRouter();
  const isDesktop = useIsDesktop();
  const isStudio = useIsStudio();
  const [railTool, setRailTool] = useState<RailTool | null>("media");
  const [timelineHeight, setTimelineHeight] = useStudioTimelineHeight();
  const previewFullscreen = useSyncExternalStore(
    (onChange) => {
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    },
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const snapping = useEditor((s) => s.snapping);
  // Studio: files from the computer dropped on a track are imported right there.
  const onFilesRef = useRef<(files: File[], placement?: ImportPlacement) => Promise<void>>(async () => {});
  useEffect(() => {
    const onDrop = (e: Event) => {
      const { files, at, prefer } = (e as CustomEvent<{ files: File[] } & ImportPlacement>).detail;
      void onFilesRef.current(files, { at, prefer });
    };
    window.addEventListener(DROP_FILES_EVENT, onDrop);
    return () => window.removeEventListener(DROP_FILES_EVENT, onDrop);
  }, []);
  // Studio: selecting a text opens the Text panel on the left, so it is clear you are editing text.
  // (Not while browsing templates, stickers or captions, which select the text they just added.)
  useEffect(
    () =>
      useEditor.subscribe((s, prev) => {
        if (s.selectedClipId === prev.selectedClipId || !s.selectedClipId) return;
        const clip = findClip(s.project, s.selectedClipId)?.clip;
        if (clip?.type !== "text") return;
        setRailTool((current) => (current === "templates" || current === "stickers" || current === "captions" ? current : "text"));
      }),
    [],
  );
  const toolbarStyle = useToolbarStyle();
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
  useBackButton(persistence.state === "ready");

  useEffect(() => {
    void detectCapabilities().then(setCaps);
  }, []);

  const openPicker = (accept: string) => {
    if (!fileInput.current) return;
    fileInput.current.accept = accept;
    fileInput.current.click();
  };

  const onFiles = async (files: File[], placement?: ImportPlacement) => {
    if (!files.length) return;
    setErrors([]);
    setImporting({ done: 0, total: files.length });
    const before = new Set(Object.keys(useEditor.getState().project.assets));
    const problems = await importFiles(files, (done, total) => setImporting({ done, total }), placement);
    setImporting(null);
    setErrors(problems);
    const added = Object.values(useEditor.getState().project.assets).filter((a) => !before.has(a.id));
    if (added.some((a) => a.hdr)) {
      // HDR phone footage is shown and exported in standard range, which can look a bit flatter.
      useEditor.getState().showToast(t("editor.toasts.addedHdr"));
    } else if (problems.length < files.length) {
      useEditor.getState().showToast(t("editor.toasts.added", { count: files.length - problems.length }));
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  useEffect(() => {
    onFilesRef.current = onFiles;
  });

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
        <p className="text-sm">{t("editor.loading.opening")}</p>
      </div>
    );
  }

  if (caps?.tier === "unsupported") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#09090b] p-6 text-center text-neutral-200">
        <h1 className="text-lg font-semibold">
          {caps.secureContext ? t("editor.unsupported.browserTitle") : t("editor.unsupported.httpsTitle")}
        </h1>
        <p className="max-w-sm text-sm text-neutral-400">{caps.reason && t(`editor.unsupported.${caps.reason}`)}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const panelNode = <ActivePanel panel={panel} text={selectedText} media={selectedMedia} />;
  const hasPanel = panel !== null && (panel === "templates" || panel === "captions" || panel === "stickers" || panel === "voiceover" || panel === "beats" || Boolean(found));
  const timelineNode = timelineCollapsed ? <MiniTimeline /> : <Timeline />;

  const transport = (
    <div className="flex h-11 shrink-0 items-center gap-2 px-2 text-xs">
      <button
        type="button"
        aria-label={playing ? t("editor.transport.pause") : t("editor.transport.play")}
        title={playing ? t("editor.transport.pauseHint") : t("editor.transport.playHint")}
        onClick={togglePlay}
        disabled={duration === 0}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 shadow transition-transform active:scale-90 disabled:opacity-30 [&_svg]:size-4"
      >
        {playing ? <Pause className="fill-current" /> : <Play className="translate-x-px fill-current" />}
      </button>
      <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-neutral-200 sm:text-xs">
        <PlayheadTime fps={fps} />
        <span className="text-neutral-500"> / {formatTimecode(duration, fps)}</span>
      </span>
      {importing && (
        <span className="flex items-center gap-1.5 text-neutral-400">
          <LoaderCircle className="size-4 animate-spin text-gold" />
          <span className="sm:hidden">{importing.total > 1 ? `${Math.min(importing.done + 1, importing.total)}/${importing.total}` : t("editor.transport.adding")}</span>
          <span className="hidden sm:inline">
            {t("editor.transport.addingCount", { current: Math.min(importing.done + 1, importing.total), total: importing.total })}
          </span>
        </span>
      )}
      <div className="ms-auto flex items-center gap-1">
        <SoundButton />
        <select
          aria-label={t("editor.transport.platform")}
          title={t("editor.transport.videoShape")}
          value={project.platform}
          onChange={(e) => {
            const platform = e.target.value as PlatformId;
            edit(t("editor.undo.platform", { name: PLATFORMS[platform].label }), (draft) => setPlatform(draft, platform));
            // Let the arrow keys go back to moving the playhead.
            e.currentTarget.blur();
          }}
          className="hidden h-8 rounded-full sm:block border border-white/10 bg-white/[0.04] px-2 text-xs text-neutral-200"
        >
          {PLATFORM_ORDER.map((id) => (
            <option key={id} value={id}>
              {PLATFORMS[id].label}
            </option>
          ))}
        </select>
        <IconButton
          label={timelineCollapsed ? t("editor.transport.showTimeline") : t("editor.transport.hideTimeline")}
          onClick={() => useEditor.getState().setTimelineCollapsed(!timelineCollapsed)}
          active={timelineCollapsed}
        >
          {timelineCollapsed ? <PanelBottomOpen /> : <PanelBottomClose />}
        </IconButton>
        <IconButton
          label={project.mainMagnet ? t("editor.transport.magnetOn") : t("editor.transport.magnetOff")}
          onClick={() => edit(project.mainMagnet ? t("editor.undo.magnetOff") : t("editor.undo.magnetOn"), (d) => setMainMagnet(d, !project.mainMagnet))}
          active={project.mainMagnet}
        >
          <Magnet />
        </IconButton>
        <IconButton label={t("editor.transport.safeZone")} onClick={toggleSafeZone} active={showSafeZone} disabled={!hasSafeZone}>
          <Frame />
        </IconButton>
        <span className="hidden items-center gap-1 md:flex">
          <IconButton label={t("editor.transport.zoomOut")} onClick={() => setZoom(pxPerSecond / 1.4)}>
            <ZoomOut />
          </IconButton>
          <IconButton label={t("editor.transport.zoomFit")} onClick={zoomToFit}>
            <Maximize />
          </IconButton>
          <IconButton label={t("editor.transport.zoomIn")} onClick={() => setZoom(pxPerSecond * 1.4)}>
            <ZoomIn />
          </IconButton>
        </span>
      </div>
    </div>
  );

  // One list of tools for the current selection, shown as the dial or as the classic row.
  const panelTool = (id: Panel, label: string, icon: ReactNode, hint?: string): DialTool => ({
    id,
    label,
    icon,
    hint,
    active: panel === id,
    onSelect: () => toggle(id),
  });
  const split: DialTool = { id: "split", label: t("editor.tools.split"), icon: <Scissors />, hint: "S", onSelect: splitAtPlayhead, disabled: duration === 0 };
  const copy: DialTool = { id: "copy", label: t("editor.tools.copy"), icon: <Copy />, hint: "Ctrl+D", onSelect: duplicateSelected };
  const clipSelected = Boolean(selectedText || selectedMedia);
  // A just-added text is a draft until Add; Cancel takes it away again.
  const isDraft = Boolean(selectedText && draftText?.clipId === selectedText.id);
  const done: DialTool = isDraft
    ? { id: "cancel", label: t("common.cancel"), icon: <X />, onSelect: () => useEditor.getState().resolveDraftText(false) }
    : { id: "done", label: t("common.done"), icon: <Check />, hint: "Esc", onSelect: () => select(null) };
  const remove: DialTool = isDraft
    ? { id: "confirm", label: t("editor.tools.add"), icon: <Check />, onSelect: confirmDraftText }
    : { id: "delete", label: t("common.delete"), icon: <Trash />, hint: "Del", onSelect: requestDeleteSelected };

  let tools: DialTool[];
  let home: string;
  if (selectedText) {
    tools = [
      panelTool("style", t("editor.tools.styles"), <Shapes />),
      panelTool("font", t("editor.tools.font"), <CaseSensitive />),
      panelTool("edit", t("editor.tools.edit"), <Pencil />),
      panelTool("color", t("editor.tools.color"), <Palette />),
      panelTool("size", t("editor.tools.size"), <ALargeSmall />),
      panelTool("animate", t("editor.tools.animate"), <Sparkles />),
      ...(isDraft ? [] : [split, copy]),
    ];
    home = "edit";
  } else if (selectedMedia) {
    tools = [
      ...(isVisual
        ? [
            panelTool("crop", t("editor.tools.crop"), <Crop />),
            panelTool("frame", t("editor.tools.frame"), <FrameIcon />),
            panelTool("color", t("editor.tools.color"), <SunMedium />),
            panelTool("zoom", t("editor.tools.zoom"), <Focus />),
          ]
        : []),
      split,
      panelTool("speed", t("editor.tools.speed"), <Gauge />),
      panelTool("audio", t("editor.tools.audio"), <Volume2 />),
      ...(onMainTrack ? [panelTool("transition", t("editor.tools.transition"), <Blend />)] : []),
      ...(isVisual && (selectedTrack === "main" || selectedTrack === "overlay")
        ? [
            {
              id: "layer",
              label: onMainTrack ? t("editor.tools.overlay") : t("editor.tools.toMain"),
              icon: <Layers />,
              onSelect: () => (onMainTrack ? toOverlay() : toMain()),
            },
          ]
        : []),
      copy,
    ];
    home = "split";
  } else {
    tools = [
      panelTool("beats", t("editor.tools.beats"), <AudioWaveform />, "M"),
      panelTool("captions", t("editor.tools.captions"), <Captions />),
      panelTool("templates", t("editor.tools.templates"), <LayoutTemplate />),
      { id: "text", label: t("editor.tools.text"), icon: <Type />, hint: "T", onSelect: () => addText() },
      { id: "add", label: t("editor.tools.add"), icon: <Plus />, onSelect: () => openPicker(ACCEPT_ALL), disabled: Boolean(importing) },
      { id: "music", label: t("editor.tools.music"), icon: <Music />, onSelect: () => openPicker(ACCEPT_AUDIO), disabled: Boolean(importing) },
      panelTool("voiceover", t("editor.tools.voice"), <Mic />),
      panelTool("stickers", t("editor.tools.stickers"), <Sticker />),
      split,
    ];
    home = "add";
  }

  // With the dial, a text tool's choices go onto the dial itself (its full panel is behind "More").
  const picker = toolbarStyle === "dial" && selectedText && isTextPicker(panel) ? panel : null;

  const toolbar =
    toolbarStyle === "dial" ? (
      <nav className="shrink-0 border-t border-white/[0.06] bg-[radial-gradient(160px_70px_at_50%_0%,rgba(226,191,126,0.07),transparent)] px-1 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-14px))]">
        {picker && selectedText ? (
          <TextPicker key={`${selectedText.id}:${picker}`} clip={selectedText} tool={picker} isDesktop={isDesktop} />
        ) : (
          <DialRow
            leading={clipSelected ? done : undefined}
            trailing={clipSelected ? remove : undefined}
            trailingTone={isDraft ? "confirm" : "danger"}
          >
            <ToolDial tools={tools} home={home} enterFrom={-1.5} />
          </DialRow>
        )}
      </nav>
    ) : (
      <nav className="flex shrink-0 items-start justify-start gap-0.5 overflow-x-auto border-t border-white/[0.06] bg-[#09090b] px-2 pt-1.5 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-14px))] [scrollbar-width:none] md:justify-center">
        {[...(clipSelected ? [{ ...done, label: t("common.back"), icon: <ChevronLeft className="rtl:rotate-180" /> }] : []), ...tools, ...(clipSelected ? [remove] : [])].map((tool) => (
          <ToolButton key={tool.id} icon={tool.icon} label={tool.label} hint={tool.hint} active={tool.active} disabled={tool.disabled} onClick={tool.onSelect} />
        ))}
      </nav>
    );

  const notices = (
    <>
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
          <button type="button" aria-label={t("editor.dismiss")} onClick={() => setErrors([])} className="text-red-200">
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );

  /** Studio: play controls under the preview, like a desktop editor. */
  const studioTransport = (
    <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-white/[0.06] px-4">
      <span className="whitespace-nowrap font-mono text-sm tabular-nums text-neutral-100">
        <PlayheadTime fps={fps} />
        <span className="text-neutral-500"> / {formatTimecode(duration, fps)}</span>
      </span>
      <div className="flex items-center gap-1">
        <IconButton label={t("editor.studio.transport.start")} onClick={() => jumpTo("start")} disabled={duration === 0}>
          <SkipBack />
        </IconButton>
        <IconButton label={t("editor.studio.transport.prevCut")} onClick={() => jumpToEditPoint(-1)} disabled={duration === 0}>
          <ChevronsLeft />
        </IconButton>
        <IconButton label={t("editor.studio.transport.prevFrame")} onClick={() => stepFrames(-1)} disabled={duration === 0}>
          <StepBack />
        </IconButton>
        <button
          type="button"
          aria-label={playing ? t("editor.transport.pause") : t("editor.transport.play")}
          title={playing ? t("editor.transport.pauseHint") : t("editor.transport.playHint")}
          onClick={togglePlay}
          disabled={duration === 0}
          className="mx-1 flex size-11 items-center justify-center rounded-full bg-white text-neutral-950 shadow transition-transform active:scale-90 disabled:opacity-30 [&_svg]:size-5"
        >
          {playing ? <Pause className="fill-current" /> : <Play className="translate-x-px fill-current" />}
        </button>
        <IconButton label={t("editor.studio.transport.nextFrame")} onClick={() => stepFrames(1)} disabled={duration === 0}>
          <StepForward />
        </IconButton>
        <IconButton label={t("editor.studio.transport.nextCut")} onClick={() => jumpToEditPoint(1)} disabled={duration === 0}>
          <ChevronsRight />
        </IconButton>
        <IconButton label={t("editor.studio.transport.end")} onClick={() => jumpTo("end")} disabled={duration === 0}>
          <SkipForward />
        </IconButton>
      </div>
      <div className="flex items-center justify-end gap-1">
        {importing && <LoaderCircle className="size-4 animate-spin text-gold" />}
        <SoundButton />
        <IconButton label={t("editor.transport.safeZone")} onClick={toggleSafeZone} active={showSafeZone} disabled={!hasSafeZone}>
          <Frame />
        </IconButton>
        <IconButton
          label={previewFullscreen ? t("editor.studio.exitFullscreen") : t("editor.studio.fullscreen")}
          onClick={togglePreviewFullscreen}
        >
          {previewFullscreen ? <Minimize /> : <Fullscreen />}
        </IconButton>
      </div>
    </div>
  );

  // Timeline zoom slider, on a log scale so every step feels the same.
  const zoomRange = [Math.log(MIN_PX_PER_SECOND), Math.log(MAX_PX_PER_SECOND)] as const;
  const barButton = (label: string, icon: ReactNode, onClick: () => void, opts: { hint?: string; disabled?: boolean; active?: boolean; danger?: boolean } = {}) => (
    <button
      type="button"
      onClick={onClick}
      disabled={opts.disabled}
      title={opts.hint ? `${label} (${opts.hint})` : label}
      aria-pressed={opts.active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-30 [&_svg]:size-4",
        opts.active ? "bg-gold/15 text-gold" : opts.danger ? "text-neutral-300 hover:bg-red-500/15 hover:text-red-300" : "text-neutral-300 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  /** Studio: editing tools above the timeline. */
  const studioTimelineBar = (
    <div role="toolbar" aria-label={t("editor.studio.bar.label")} className="flex h-11 shrink-0 items-center gap-1 border-t border-white/[0.06] bg-[#0b0b0e] px-2">
      {barButton(t("editor.tools.split"), <Scissors />, splitAtPlayhead, { hint: "S", disabled: duration === 0 })}
      <IconButton label={`${t("editor.menu.trimStart")} (Q)`} onClick={() => trimAtPlayhead("start")} disabled={duration === 0}>
        <ArrowLeftToLine />
      </IconButton>
      <IconButton label={`${t("editor.menu.trimEnd")} (W)`} onClick={() => trimAtPlayhead("end")} disabled={duration === 0}>
        <ArrowRightToLine />
      </IconButton>
      {barButton(t("editor.tools.copy"), <Copy />, duplicateSelected, { hint: "Ctrl+D", disabled: !clipSelected })}
      {barButton(t("common.delete"), <Trash />, requestDeleteSelected, { hint: "Del", disabled: !clipSelected, danger: true })}
      <span className="mx-1 h-5 w-px bg-white/10" />
      {barButton(t("editor.tools.beats"), <Diamond />, addBeatAtPlayhead, { hint: "M", disabled: duration === 0 })}
      {barButton(
        t("editor.studio.project.magnet"),
        <Magnet />,
        () => edit(project.mainMagnet ? t("editor.undo.magnetOff") : t("editor.undo.magnetOn"), (d) => setMainMagnet(d, !project.mainMagnet)),
        { active: project.mainMagnet },
      )}
      {barButton(t("editor.studio.snap"), <Grid2x2Check />, () => useEditor.getState().toggleSnapping(), { active: snapping, hint: t("editor.studio.snapHint") })}
      <div className="ms-auto flex items-center gap-1">
        <IconButton label={t("editor.transport.zoomOut")} onClick={() => setZoom(pxPerSecond / 1.4)}>
          <ZoomOut />
        </IconButton>
        <input
          type="range"
          dir="ltr"
          aria-label={t("editor.studio.bar.zoom")}
          min={zoomRange[0]}
          max={zoomRange[1]}
          step={0.01}
          value={Math.log(pxPerSecond)}
          onChange={(e) => setZoom(Math.exp(Number(e.target.value)))}
          className="h-6 w-36 accent-gold"
        />
        <IconButton label={t("editor.transport.zoomIn")} onClick={() => setZoom(pxPerSecond * 1.4)}>
          <ZoomIn />
        </IconButton>
        {barButton(t("editor.studio.bar.fit"), <Maximize />, zoomToFit, { hint: "0" })}
      </div>
    </div>
  );

  /** Studio: opens (or with null closes) a side panel. A template being browsed goes with its panel. */
  const pickRailTool = (tool: RailTool | null) => {
    if (railTool === "templates" && tool !== "templates") useEditor.getState().setTemplatePreview(null);
    setRailTool(tool);
  };

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
        // Over the timeline the tracks take the drop themselves (and show where it lands).
        setDropping(!(e.target as HTMLElement).closest("[data-timeline]"));
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
          aria-label={t("editor.header.backToProjects")}
          title={t("editor.header.backToProjectsHint")}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            leaveEditor(router);
          }}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 active:bg-white/15"
        >
          <ChevronLeft className="size-6 rtl:rotate-180" />
        </Link>
        {/* The project: tap for name, video shape, backup and history. */}
        <button
          type="button"
          onClick={() => openDialog("project")}
          title={t("editor.header.projectHint")}
          className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] pe-2 ps-3 text-start transition-colors hover:bg-white/[0.07] active:bg-white/10"
        >
          <span className="flex min-w-0 flex-col">
            <span dir="auto" className="truncate text-sm font-semibold leading-tight text-neutral-100">{project.name}</span>
            <span className="flex items-center gap-1 text-[10px] leading-tight text-neutral-500">
              {persistence.savedAt && <Check className="size-3 shrink-0 text-emerald-400" />}
              <span className="truncate">{persistence.savedAt ? t("editor.header.saved") : t("editor.header.notSaved")} · {PLATFORMS[project.platform].label}</span>
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconButton label={t("editor.header.shortcuts")} onClick={() => openDialog("shortcuts")} className="hidden md:flex">
            <Keyboard />
          </IconButton>
          <AppModeButton />
          {/* On phones, History lives in the project sheet to keep the top bar roomy. */}
          <IconButton label={t("editor.header.history")} onClick={() => openDialog("history")} disabled={!canUndo && !canRedo} className="hidden md:flex">
            <History />
          </IconButton>
          <IconButton label={t("editor.header.undo")} onClick={undo} disabled={!canUndo} className="size-10 md:size-9">
            <Undo2 />
          </IconButton>
          <IconButton label={t("editor.header.redo")} onClick={redo} disabled={!canRedo} className="size-10 md:size-9">
            <Redo2 />
          </IconButton>
          <button
            type="button"
            disabled={duration === 0}
            onClick={openExport}
            title={t("editor.header.exportHint")}
            className="ms-1 flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 sm:px-4 text-sm font-semibold text-neutral-950 shadow-[0_4px_20px_-6px_rgba(255,255,255,0.4)] transition-transform active:scale-95 disabled:opacity-40 md:h-9"
          >
            <Download className="hidden size-4 sm:block" />
            {t("editor.header.export")}
          </button>
        </div>
      </header>

      {isStudio ? (
        <>
          <div className="flex min-h-0 flex-1">
            <StudioRail active={railTool} onPick={pickRailTool} onMusic={() => openPicker(ACCEPT_AUDIO)} />
            {railTool && <StudioSidePanel tool={railTool} onClose={() => pickRailTool(null)} onImport={() => openPicker(ACCEPT_ALL)} />}
            <div ref={setPreviewColumn} className="flex min-w-0 flex-1 flex-col [&:fullscreen]:bg-black">
              <main className="min-h-0 flex-1 px-6 py-4">
                <Preview onImport={() => openPicker(ACCEPT_ALL)} onAddText={() => addText()} onTemplates={() => pickRailTool("templates")} />
              </main>
              {studioTransport}
            </div>
            <StudioInspector
              title={selectedText ? selectedText.text || t("editor.timeline.text") : selectedMedia ? (project.assets[selectedMedia.assetId]?.name ?? t("editor.timeline.clip")) : null}
              tools={clipSelected ? tools : []}
              leading={isDraft ? done : undefined}
              trailing={clipSelected ? remove : undefined}
              trailingTone={isDraft ? "confirm" : "danger"}
              preferred={selectedText ? "edit" : isVisual ? "frame" : "audio"}
            >
              {clipSelected ? panelNode : <StudioProjectPanel />}
            </StudioInspector>
          </div>
          {notices}
          <TimelineResizer height={timelineHeight} onResize={setTimelineHeight} />
          {studioTimelineBar}
          <div className="shrink-0" style={{ height: timelineHeight }}>
            <Timeline studio />
          </div>
        </>
      ) : (
        <>
      {/* Workspace: on desktop the tool panel sits beside the preview; on phones it replaces the timeline. */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 px-3 py-2">
            <Preview onImport={() => openPicker(ACCEPT_ALL)} onAddText={() => addText()} onTemplates={() => openPanel("templates")} />
          </main>
          {transport}
        </div>
        {isDesktop && hasPanel && (
          <aside className="flex w-[380px] shrink-0 flex-col border-s border-white/[0.06] bg-[#111114]">{panelNode}</aside>
        )}
      </div>

      {notices}

      {isDesktop ? timelineNode : hasPanel && (!picker || moreOpen) ? panelNode : timelineNode}
      {toolbar}
        </>
      )}

      {dropping && (
        <div className="pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/70 bg-black/70 text-gold backdrop-blur-sm">
          <Upload className="size-8" />
          <p className="text-sm font-semibold">{t("editor.dropHint")}</p>
        </div>
      )}
      {exporting && <ExportDialog onClose={() => setExporting(false)} advanced={isStudio} />}
      {dialog === "history" && <HistorySheet />}
      {dialog === "shortcuts" && <ShortcutsSheet />}
      {dialog === "project" && <ProjectSheet savedAt={persistence.savedAt} isDesktop={isDesktop} />}
      <ToastHost />
      <PageTitle page="editor" />
      <ConfirmDialog />
      <ContextMenu />
    </div>
  );
}
