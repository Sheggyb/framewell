"use client";

/**
 * The desktop "studio" layout (wide screens): a tool rail and side panel on the left, the
 * preview in the middle, an inspector with every setting of the selected clip on the right,
 * and a tall, resizable timeline with track headers. Phones use the dial layout instead.
 * The panels themselves are the same components phones use, hosted in columns (PanelHost).
 */
import {
  AudioWaveform,
  Captions,
  Film,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Mic,
  Music,
  MousePointerClick,
  Plus,
  Sticker,
  Type,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { thumbnailUrl } from "@/engine/media/registry";
import { projectDuration, setMainMagnet, setPlatform } from "@/engine/model/ops";
import { PLATFORM_ORDER, PLATFORMS } from "@/engine/model/platforms";
import type { MediaAsset, TextClip } from "@/engine/model/project";
import { applyPreset, presetStyle, TEXT_PRESETS, type TextPreset } from "@/engine/model/text";
import { formatTimecode } from "@/engine/model/time";
import { useT } from "@/i18n";
import { capturePointer } from "@/lib/pointer";
import { cn } from "@/lib/utils";
import { addAssetToTimeline, addText, previewAnimation, updateText } from "@/store/actions";
import { useEditor, type Panel } from "@/store/editor";
import { BeatsPanel } from "./BeatsPanel";
import { CaptionsPanel } from "./CaptionsPanel";
import { PanelHost } from "./controls";
import { StickersPanel } from "./StickersPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { previewCss, usePresetLabel } from "./TextPanel";
import type { DialTool } from "./ToolDial";
import { ASSET_DRAG_TYPE } from "./Timeline";
import { VoiceoverPanel } from "./VoiceoverPanel";

export const STUDIO_QUERY = "(min-width: 1024px)";

/** The studio's preview column (preview + play controls), for full-screen preview. */
let previewColumn: HTMLElement | null = null;
export const setPreviewColumn = (el: HTMLElement | null) => {
  previewColumn = el;
};

/** Full-screen preview on or off (the F key and the button under the preview). Studio only. */
export function togglePreviewFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else if (previewColumn) void previewColumn.requestFullscreen?.().catch(() => {});
}

/** True on wide screens, where the editor uses the studio layout. */
export function useIsStudio(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(STUDIO_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(STUDIO_QUERY).matches,
    () => false,
  );
}

export type RailTool = "media" | "text" | "templates" | "captions" | "stickers" | "voiceover" | "beats";

// ---------- left: tool rail + side panel ----------

function RailButton({ icon, label, active, dot, onClick }: { icon: ReactNode; label: string; active?: boolean; dot?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition-colors [&_svg]:size-5",
        active ? "bg-gold/15 text-gold" : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100",
      )}
    >
      {icon}
      {dot && <span className="absolute end-2.5 top-2 size-1.5 rounded-full bg-gold" />}
      <span className="max-w-full truncate px-0.5">{label}</span>
    </button>
  );
}

/** The column of tools on the far left. Panels open beside it; Text and Music act at once. */
export function StudioRail({
  active,
  onPick,
  onMusic,
}: {
  active: RailTool | null;
  onPick: (tool: RailTool | null) => void;
  onMusic: () => void;
}) {
  const t = useT();
  // A dot on Text while a text is selected, so it is clear where its tools are.
  const textSelected = useEditor((s) => {
    const clip = s.selectedClipId ? s.project.tracks.flatMap((tr) => tr.clips).find((c) => c.id === s.selectedClipId) : undefined;
    return clip?.type === "text";
  });
  const panel = (tool: RailTool, label: string, icon: ReactNode) => (
    <RailButton
      key={tool}
      icon={icon}
      label={label}
      active={active === tool}
      dot={tool === "text" && textSelected && active !== "text"}
      onClick={() => onPick(active === tool ? null : tool)}
    />
  );
  return (
    <nav aria-label={t("editor.studio.tools")} className="flex w-[4.5rem] shrink-0 flex-col gap-1 border-e border-white/[0.06] bg-[#0b0b0e] p-1.5">
      {panel("media", t("editor.studio.media"), <Film />)}
      {panel("text", t("editor.tools.text"), <Type />)}
      {panel("templates", t("editor.tools.templates"), <LayoutTemplate />)}
      {panel("captions", t("editor.tools.captions"), <Captions />)}
      {panel("stickers", t("editor.tools.stickers"), <Sticker />)}
      <RailButton icon={<Music />} label={t("editor.tools.music")} onClick={onMusic} />
      {panel("voiceover", t("editor.tools.voice"), <Mic />)}
      {panel("beats", t("editor.tools.beats"), <AudioWaveform />)}
    </nav>
  );
}

/** The side panel for the rail tool that is open. */
export function StudioSidePanel({ tool, onClose, onImport }: { tool: RailTool; onClose: () => void; onImport: () => void }) {
  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-e border-white/[0.06] bg-[#111114]">
      <PanelHost.Provider value={{ embedded: true, onClose }}>
        {tool === "media" && <MediaLibrary onImport={onImport} />}
        {tool === "text" && <TextSidePanel />}
        {tool === "templates" && <TemplatesPanel />}
        {tool === "captions" && <CaptionsPanel />}
        {tool === "stickers" && <StickersPanel />}
        {tool === "voiceover" && <VoiceoverPanel />}
        {tool === "beats" && <BeatsPanel />}
      </PanelHost.Provider>
    </aside>
  );
}

function AssetThumb({ asset }: { asset: MediaAsset }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (asset.kind !== "audio") void thumbnailUrl(asset.id, 0.5).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [asset.id, asset.kind]);
  if (asset.kind === "audio") return <Music className="size-5 text-emerald-300/80" />;
  // eslint-disable-next-line @next/next/no-img-element -- local blob URL
  return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-5 text-neutral-600" />;
}

/** Everything imported into this project, ready to put (back) on the timeline. */
function MediaLibrary({ onImport }: { onImport: () => void }) {
  const t = useT();
  const project = useEditor((s) => s.project);
  const assets = Object.values(project.assets);
  const used = new Set(project.tracks.flatMap((tr) => tr.clips.map((c) => (c.type === "media" ? c.assetId : ""))));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">{t("editor.studio.library.title")}</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        <button
          type="button"
          onClick={onImport}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 text-sm font-medium text-gold hover:bg-gold/10"
        >
          <FolderOpen className="size-4" /> {t("editor.studio.library.import")}
        </button>
        {assets.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-neutral-500">{t("editor.studio.library.empty")}</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="group relative cursor-grab overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] active:cursor-grabbing"
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-black">
                    <AssetThumb asset={asset} />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="truncate text-[11px] font-medium text-neutral-200">
                        {asset.name}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-500">
                        {formatTimecode(asset.duration, project.canvas.fps).slice(0, 5)}
                        {used.has(asset.id) && <span className="ms-1.5 font-sans text-gold/80">· {t("editor.studio.library.inUse")}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("editor.studio.library.addToTimeline", { name: asset.name })}
                      title={t("editor.studio.library.addToTimeline", { name: asset.name })}
                      onClick={() => addAssetToTimeline(asset.id)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 opacity-90 hover:opacity-100"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-center text-[11px] text-neutral-500">{t("editor.studio.library.dragHint")}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- right: inspector ----------

/** Clip tools that open a settings panel (the rest, like Split, are actions). */
const PANEL_TOOLS = new Set<string>(["style", "font", "edit", "color", "size", "animate", "crop", "frame", "zoom", "speed", "audio", "transition"]);

/**
 * Every setting of the selected clip, always at hand: its actions, a tab per tool, and the
 * open tool's panel. With nothing selected, a hint.
 */
export function StudioInspector({
  title,
  tools,
  leading,
  trailing,
  trailingTone,
  preferred,
  children,
}: {
  title: string | null;
  /** The tab to open first when a clip is selected (else the first tab). */
  preferred?: string;
  tools: DialTool[];
  leading?: DialTool;
  trailing?: DialTool;
  trailingTone: "danger" | "confirm";
  children: ReactNode;
}) {
  const t = useT();
  const panel = useEditor((s) => s.panel);
  const tabs = tools.filter((tool) => PANEL_TOOLS.has(tool.id));
  const actions = tools.filter((tool) => !PANEL_TOOLS.has(tool.id));
  const selectedId = useEditor((s) => s.selectedClipId);
  const others = useEditor((s) => s.multi.length);

  // Selecting a clip opens its first tool, so its settings are showing straight away.
  const firstTab = tabs.find((tab) => tab.id === preferred)?.id ?? tabs[0]?.id;
  const hasOpenTab = tabs.some((tab) => tab.id === panel);
  useEffect(() => {
    if (title !== null && firstTab && !hasOpenTab) useEditor.getState().openPanel(firstTab as Panel);
  }, [selectedId, title, firstTab, hasOpenTab]);

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-s border-white/[0.06] bg-[#111114]">
      {title === null && children ? (
        children
      ) : title === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <MousePointerClick className="size-7 text-neutral-600" />
          <p className="text-sm font-medium text-neutral-300">{t("editor.studio.inspector.empty")}</p>
          <p className="text-xs leading-relaxed text-neutral-500">{t("editor.studio.inspector.emptyHint")}</p>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-2 border-b border-white/[0.06] p-3">
            <p dir="auto" className="truncate px-1 text-sm font-semibold text-neutral-100">
              {title}
            </p>
            {others > 0 && <p className="-mt-1 px-1 text-xs text-gold">{t("editor.many.more", { count: others })}</p>}
            <div className="flex flex-wrap gap-1">
              {[...(leading ? [leading] : []), ...actions].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={a.disabled}
                  onClick={a.onSelect}
                  title={a.hint ? `${a.label} (${a.hint})` : a.label}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-neutral-200 hover:bg-white/[0.08] disabled:opacity-30 [&_svg]:size-4"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
              {trailing && (
                <button
                  type="button"
                  onClick={trailing.onSelect}
                  title={trailing.hint ? `${trailing.label} (${trailing.hint})` : trailing.label}
                  className={cn(
                    "ms-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium [&_svg]:size-4",
                    trailingTone === "confirm" ? "bg-gold text-neutral-950" : "bg-red-500/10 text-red-300 hover:bg-red-500/20",
                  )}
                >
                  {trailing.icon}
                  {trailing.label}
                </button>
              )}
            </div>
            <div role="tablist" className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={panel === tab.id}
                  onClick={() => useEditor.getState().openPanel(tab.id as Panel)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors [&_svg]:size-4",
                    panel === tab.id ? "bg-white text-neutral-950" : "text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <PanelHost.Provider value={{ embedded: true }}>{children}</PanelHost.Provider>
          </div>
        </>
      )}
    </aside>
  );
}

// ---------- bottom: resizable timeline ----------

const TIMELINE_KEY = "framewell:studio-timeline-height";
const MIN_TIMELINE = 150;

/** Timeline height in the studio, remembered on this computer. */
export function useStudioTimelineHeight(): [number, (h: number) => void] {
  const [height, setHeight] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(TIMELINE_KEY));
      if (saved >= MIN_TIMELINE) return saved;
    } catch {
      // Storage unavailable.
    }
    return 280;
  });
  const set = (h: number) => {
    const clamped = Math.round(Math.min(Math.max(h, MIN_TIMELINE), window.innerHeight * 0.65));
    setHeight(clamped);
    try {
      localStorage.setItem(TIMELINE_KEY, String(clamped));
    } catch {
      // Not remembered.
    }
  };
  return [height, set];
}

/** The bar above the timeline: drag it up or down to give the timeline more or less room. */
export function TimelineResizer({ height, onResize }: { height: number; onResize: (h: number) => void }) {
  const t = useT();
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("editor.studio.resize")}
      aria-valuenow={height}
      tabIndex={0}
      title={t("editor.studio.resize")}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") onResize(height + 24);
        else if (e.key === "ArrowDown") onResize(height - 24);
        else return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        const startY = e.clientY;
        const startH = height;
        const el = e.currentTarget;
        capturePointer(el, e.pointerId);
        const move = (ev: PointerEvent) => onResize(startH + (startY - ev.clientY));
        const up = () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      }}
      className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center bg-[#09090b] outline-none focus-visible:bg-gold/20"
    >
      <span className="h-1 w-10 rounded-full bg-white/10 transition-colors group-hover:bg-gold/60" />
    </div>
  );
}

// ---------- right, nothing selected: the project ----------

/** An on/off row for the project panel. */
function Switch({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-start text-sm text-neutral-200 hover:bg-white/[0.05] disabled:opacity-40"
    >
      {label}
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-gold" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-[inset-inline-start]", on ? "start-[18px]" : "start-0.5")} />
      </span>
    </button>
  );
}

/** With no clip selected, the inspector shows the project: its shape, length and a few switches. */
export function StudioProjectPanel() {
  const t = useT();
  const project = useEditor((s) => s.project);
  const showSafeZone = useEditor((s) => s.showSafeZone);
  const { edit } = useEditor.getState();
  const clipCount = project.tracks.reduce((n, tr) => n + tr.clips.length, 0);
  const hasSafeZone = PLATFORMS[project.platform].safeZone !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-100">{t("editor.project.title")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">{t("editor.studio.project.selectHint")}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <dt className="text-neutral-500">{t("editor.studio.project.length")}</dt>
          <dd className="mt-0.5 font-mono text-sm text-neutral-100">{formatTimecode(projectDuration(project), project.canvas.fps)}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <dt className="text-neutral-500">{PLATFORMS[project.platform].label}</dt>
          <dd className="mt-0.5 text-sm text-neutral-100">
            {project.canvas.width}×{project.canvas.height} · {t("common.clips", { count: clipCount })}
          </dd>
        </div>
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{t("editor.project.videoShape")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORM_ORDER.map((id) => {
            const p = PLATFORMS[id];
            const active = project.platform === id;
            const w = p.width > p.height ? 22 : (22 * p.width) / p.height;
            const h = p.height >= p.width ? 22 : (22 * p.height) / p.width;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => edit(t("editor.undo.platform", { name: p.label }), (d) => setPlatform(d, id))}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs transition-colors",
                  active ? "border-gold/70 bg-gold/10 text-white" : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]",
                )}
              >
                <span className="flex size-6 items-center justify-center">
                  <span className={cn("rounded-[3px] border-[1.5px]", active ? "border-gold" : "border-neutral-400")} style={{ width: w, height: h }} />
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="-mx-1 flex flex-col">
        <Switch
          on={project.mainMagnet}
          label={t("editor.studio.project.magnet")}
          onClick={() => edit(project.mainMagnet ? t("editor.undo.magnetOff") : t("editor.undo.magnetOn"), (d) => setMainMagnet(d, !project.mainMagnet))}
        />
        <Switch on={showSafeZone && hasSafeZone} disabled={!hasSafeZone} label={t("editor.studio.project.safeZone")} onClick={() => useEditor.getState().toggleSafeZone()} />
      </section>
    </div>
  );
}

// ---------- left: the Text panel ----------

/**
 * Everything about text in one place: add a text, restyle the selected one (or add one in a
 * style), and jump to any text in the video. Opens by itself when a text is selected.
 */
function TextSidePanel() {
  const t = useT();
  const presetLabel = usePresetLabel();
  const project = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedClipId);
  const fps = project.canvas.fps;
  const texts = project.tracks
    .filter((tr) => tr.kind === "text")
    .flatMap((tr) => tr.clips)
    .filter((c): c is TextClip => c.type === "text")
    .sort((a, b) => a.start - b.start);
  const selected = texts.find((c) => c.id === selectedId);

  const applyStyle = (preset: TextPreset) => {
    if (!selected) return addText(preset.id);
    updateText(selected.id, t("text.undo.styleNamed", { name: presetLabel(preset) }), (c) => applyPreset(c, preset), "now");
    if (preset.animation?.in) previewAnimation(selected.id, "in");
    else if (preset.animation?.loop) previewAnimation(selected.id, "loop");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center px-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-100">{t("editor.studio.text.title")}</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        <button
          type="button"
          onClick={() => addText()}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950"
        >
          <Type className="size-4" /> {t("editor.studio.text.add")}
        </button>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{t("editor.studio.text.styles")}</h3>
          <p className="text-[11px] leading-relaxed text-neutral-500">{t("editor.studio.text.stylesHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyStyle(preset)}
                title={presetLabel(preset)}
                className={cn(
                  "flex h-16 items-center justify-center overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-1 transition-colors hover:border-white/30",
                  selected?.style.fontId === presetStyle(preset).fontId && selected.style.color === presetStyle(preset).color
                    ? "border-gold/60"
                    : "border-white/10",
                )}
              >
                <span className="max-w-full truncate" style={previewCss(presetStyle(preset), 18)}>
                  {presetLabel(preset)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">{t("editor.studio.text.inVideo")}</h3>
          {texts.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("editor.studio.text.none")}</p>
          ) : (
            texts.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => {
                  const s = useEditor.getState();
                  s.select(clip.id);
                  s.setPlayhead(clip.start);
                }}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-2.5 text-start text-sm transition-colors",
                  clip.id === selectedId ? "bg-gold/10 text-white" : "text-neutral-300 hover:bg-white/[0.05]",
                )}
              >
                <span className="font-mono text-[11px] text-neutral-500">{formatTimecode(clip.start, fps).slice(0, 5)}</span>
                <span dir="auto" className="min-w-0 flex-1 truncate">
                  {clip.text || t("editor.timeline.text")}
                </span>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
