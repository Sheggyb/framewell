"use client";

import { Blend } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { clipEnd, getTrack, moveClip, projectDuration, reorderClip, trimClip, visiblePunches } from "@/engine/model/ops";
import { audioReadyVersion, onAudioReady, thumbnailUrl, waveform } from "@/engine/media/registry";
import type { Clip, MediaAsset, MediaClip, Project, Track, TrackKind } from "@/engine/model/project";
import { secondsToUs, usToSeconds, type Micros } from "@/engine/model/time";
import { punchSpan } from "@/engine/model/zoom";
import { capturePointer } from "@/lib/pointer";
import { clipsTouch } from "@/engine/render/transitions";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";

const LANE_STYLE: Record<TrackKind, { height: number; clipClass: string }> = {
  text: { height: 30, clipClass: "bg-[#8f7447]" },
  caption: { height: 30, clipClass: "bg-[#5d6b80]" },
  overlay: { height: 40, clipClass: "bg-[#4d5a52]" },
  main: { height: 52, clipClass: "bg-[#3a4757]" },
  audio: { height: 32, clipClass: "bg-[#35574a]" },
};

const TICK_STEPS_S = [0.5, 1, 2, 5, 10, 15, 30, 60, 120];
const MIN_TICK_SPACING_PX = 56;
const SNAP_PX = 8;

function tickLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clipLabel(project: Project, clip: Clip): string {
  return clip.type === "media" ? (project.assets[clip.assetId]?.name ?? "Clip") : clip.text || "Text";
}

/** Text lanes stack above the main track (newest on top), audio below. */
function laneOrder(project: Project): Track[] {
  const of = (kind: TrackKind) => project.tracks.filter((t) => t.kind === kind);
  return [...of("text").reverse(), ...of("caption"), ...of("overlay"), ...of("main"), ...of("audio")];
}

type Drag = { clipId: string; mode: "move" | "start" | "end"; startX: number; origStart: Micros; origEnd: Micros };

/**
 * Mobile-style timeline: the playhead is fixed in the centre and the timeline scrolls
 * underneath it. Scroll position *is* the playhead: `scrollLeft = seconds × pxPerSecond`.
 * Selected clips get trim handles and can be dragged to a new time (or, on a magnetic main
 * track, to a new position in the order).
 */
export function Timeline() {
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const select = useEditor((s) => s.select);
  const setPlayhead = useEditor((s) => s.setPlayhead);
  const setZoom = useEditor((s) => s.setZoom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const synced = useRef({ playhead: -1, pxPerSecond: 0, halfWidth: 0 });
  const pinch = useRef<{ distance: number; pxPerSecond: number } | null>(null);
  const drag = useRef<Drag | null>(null);

  const durationPx = usToSeconds(projectDuration(project)) * pxPerSecond;
  const tickStep = TICK_STEPS_S.find((s) => s * pxPerSecond >= MIN_TICK_SPACING_PX) ?? 300;
  const tickCount = Math.floor((durationPx + halfWidth) / (tickStep * pxPerSecond)) + 1;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setHalfWidth(el.clientWidth / 2);
      useEditor.getState().setTimelineWidth(el.clientWidth);
    };
    // Measure now too: ResizeObserver only reports on the next rendered frame.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Store → scroll. Skipped when the change came from the user scrolling.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const s = synced.current;
    if (!el || (s.playhead === playhead && s.pxPerSecond === pxPerSecond && s.halfWidth === halfWidth)) return;
    synced.current = { playhead, pxPerSecond, halfWidth };
    el.scrollLeft = usToSeconds(playhead) * pxPerSecond;
  }, [playhead, pxPerSecond, halfWidth]);

  // Ctrl/⌘ + wheel (and trackpad pinch) zooms on desktop. Needs a non-passive listener.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { pxPerSecond: px, setZoom: zoom } = useEditor.getState();
        zoom(px * Math.exp(-e.deltaY * 0.01));
        return;
      }
      // Trackpads send horizontal deltas themselves; turn a mouse wheel into time scrolling.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (e.shiftKey) el.scrollTop += e.deltaY;
      else el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || useEditor.getState().playing) return;
    setPlayhead(secondsToUs(el.scrollLeft / pxPerSecond));
    synced.current = { playhead: useEditor.getState().playhead, pxPerSecond, halfWidth };
  };

  const touchDistance = (e: React.TouchEvent) =>
    Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  /** Snaps a time to the playhead, zero or any other clip edge within SNAP_PX. */
  const snap = (t: Micros, ignoreId: string): Micros => {
    const s = useEditor.getState();
    const threshold = (SNAP_PX / pxPerSecond) * 1_000_000;
    const targets = [0, s.playhead, ...s.project.markers];
    for (const track of s.project.tracks) {
      for (const c of track.clips) if (c.id !== ignoreId) targets.push(c.start, clipEnd(c));
    }
    let best = t;
    let bestDist = threshold;
    for (const target of targets) {
      const d = Math.abs(target - t);
      if (d < bestDist) {
        best = target;
        bestDist = d;
      }
    }
    return best;
  };

  const startDrag = (e: React.PointerEvent, clip: Clip, mode: Drag["mode"]) => {
    e.stopPropagation();
    useEditor.getState().pause();
    drag.current = { clipId: clip.id, mode, startX: e.clientX, origStart: clip.start, origEnd: clipEnd(clip) };
    capturePointer(e.currentTarget, e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = ((e.clientX - d.startX) / pxPerSecond) * 1_000_000;
    const { live } = useEditor.getState();
    const base = useEditor.getState().liveEdit?.base ?? useEditor.getState().project;
    const main = getTrack(base, "main");
    if (d.mode === "move" && base.mainMagnet && main?.clips.some((c) => c.id === d.clipId)) {
      // Magnet on — reorder: the clip goes before the first sibling whose middle it has passed.
      const middle = d.origStart + (d.origEnd - d.origStart) / 2 + delta;
      let t = 0;
      let index = 0;
      for (const c of main.clips) {
        if (c.id === d.clipId) continue;
        if (t + c.duration / 2 < middle) index++;
        t += c.duration;
      }
      live("Reorder clip", (draft) => reorderClip(draft, d.clipId, index));
      return;
    }
    if (d.mode === "move") {
      // Snap whichever edge is closer to a target.
      const raw = d.origStart + delta;
      const duration = d.origEnd - d.origStart;
      const byStart = snap(raw, d.clipId) - raw;
      const byEnd = snap(raw + duration, d.clipId) - (raw + duration);
      const correction = byStart !== 0 && (byEnd === 0 || Math.abs(byStart) <= Math.abs(byEnd)) ? byStart : byEnd;
      live("Move clip", (draft) => moveClip(draft, d.clipId, raw + correction));
    } else {
      const edgeTime = snap((d.mode === "start" ? d.origStart : d.origEnd) + delta, d.clipId);
      live("Trim clip", (draft) => trimClip(draft, d.clipId, d.mode as "start" | "end", edgeTime));
    }
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    useEditor.getState().commitLive();
  };

  const dragHandlers: DragHandlers = { start: startDrag, move: onDragMove, end: endDrag };

  return (
    <div className="relative select-none border-t border-white/[0.06] bg-[#0e0e11]">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={() => select(null)}
        onPointerDown={() => useEditor.getState().pause()}
        onTouchStart={(e) => {
          if (e.touches.length === 2) pinch.current = { distance: touchDistance(e), pxPerSecond };
        }}
        onTouchMove={(e) => {
          if (pinch.current && e.touches.length === 2) {
            setZoom(pinch.current.pxPerSecond * (touchDistance(e) / pinch.current.distance));
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) pinch.current = null;
        }}
        className="max-h-56 overflow-x-auto overflow-y-auto py-2 md:max-h-72 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div className="relative" style={{ width: durationPx + halfWidth * 2, paddingInline: halfWidth }}>
          {/* Beat markers: a gold tick on the ruler and a faint line through the lanes */}
          {project.markers.map((m) => (
            <div
              key={m}
              className="pointer-events-none absolute inset-y-0 w-px bg-gold/25"
              style={{ left: halfWidth + usToSeconds(m) * pxPerSecond }}
            >
              <div className="absolute top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-gold" />
            </div>
          ))}

          {/* Ruler: click anywhere on it to jump there */}
          <div
            className="relative mb-1 h-6 cursor-pointer text-[10px] text-neutral-500"
            title="Click to move the playhead here"
            onClick={(e) => {
              e.stopPropagation();
              const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
              useEditor.getState().pause();
              setPlayhead(secondsToUs(Math.max(0, x) / pxPerSecond));
            }}
          >
            {Array.from({ length: tickCount }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-white/15 pl-1"
                style={{ left: i * tickStep * pxPerSecond }}
              >
                {tickLabel(i * tickStep)}
              </div>
            ))}
          </div>

          {laneOrder(project).map((track) => (
            <div key={track.id} className="relative mb-1" style={{ height: LANE_STYLE[track.kind].height }}>
              {track.kind === "main" &&
                track.clips.map(
                  (clip, i) =>
                    i > 0 &&
                    clipsTouch(track.clips[i - 1], clip) && (
                      <TransitionMarker key={`t-${clip.id}`} clip={clip} pxPerSecond={pxPerSecond} />
                    ),
                )}
              {track.clips.map((clip) => (
                <ClipBlock
                  key={clip.id}
                  clip={clip}
                  asset={clip.type === "media" ? project.assets[clip.assetId] : undefined}
                  label={clipLabel(project, clip)}
                  kind={track.kind}
                  pxPerSecond={pxPerSecond}
                  selected={selectedClipId === clip.id}
                  onSelect={select}
                  drag={dragHandlers}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed centre playhead */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_8px_rgba(226,191,126,0.6)]">
        <div className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-gold" />
      </div>
    </div>
  );
}

/** Button on the cut between two main-track clips; opens the transition panel. */
function TransitionMarker({ clip, pxPerSecond }: { clip: Clip; pxPerSecond: number }) {
  const has = clip.type === "media" && clip.transition !== null;
  return (
    <button
      type="button"
      aria-label={has ? "Edit transition" : "Add transition"}
      onClick={(e) => {
        e.stopPropagation();
        const s = useEditor.getState();
        s.select(clip.id);
        s.openPanel("transition");
      }}
      className={cn(
        "absolute top-1/2 z-20 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border text-neutral-900 shadow",
        has ? "border-gold-soft bg-gold" : "border-white/60 bg-white/90",
      )}
      style={{ left: usToSeconds(clip.start) * pxPerSecond }}
    >
      <Blend className="size-3.5" />
    </button>
  );
}

interface DragHandlers {
  start: (e: React.PointerEvent, clip: Clip, mode: Drag["mode"]) => void;
  move: (e: React.PointerEvent) => void;
  end: () => void;
}

const MAX_THUMBS = 40;
const MAX_BARS = 400;

/** Loudness bars across an audio clip; appears once the sound has decoded. */
function Waveform({
  clip,
  assetId,
  widthPx,
  height,
  pxPerSecond,
}: {
  clip: MediaClip;
  assetId: string;
  widthPx: number;
  height: number;
  pxPerSecond: number;
}) {
  // Re-render when any audio finishes decoding; the peaks themselves are cached by the registry.
  useSyncExternalStore(onAudioReady, audioReadyVersion, () => 0);
  const data = waveform(assetId);
  if (!data) return null;
  const [peaks, rate] = data;
  const step = Math.max(3, widthPx / MAX_BARS);
  const mid = height / 2;
  let d = "";
  for (let x = 0; x < widthPx; x += step) {
    const seconds = usToSeconds(clip.sourceIn) + ((x + step / 2) / pxPerSecond) * clip.speed;
    const v = peaks[Math.floor(seconds * rate)] ?? 0;
    const h = Math.max(1, v * (height - 8)) / 2;
    d += `M${x.toFixed(1)} ${(mid - h).toFixed(1)}v${(h * 2).toFixed(1)}`;
  }
  return (
    <svg className="pointer-events-none absolute inset-0" width={widthPx} height={height} aria-hidden>
      <path d={d} stroke="rgba(255,255,255,0.55)" strokeWidth={Math.min(2, step - 1)} strokeLinecap="round" />
    </svg>
  );
}

/** One timeline thumbnail; loads its frame lazily (cached in the media registry). */
function Thumb({ assetId, seconds, width }: { assetId: string; seconds: number; width: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void thumbnailUrl(assetId, seconds).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [assetId, seconds]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
    <img src={url} alt="" draggable={false} className="h-full shrink-0 object-cover" style={{ width }} />
  ) : (
    <div className="h-full shrink-0 bg-white/[0.04]" style={{ width }} />
  );
}

/** Frames across a video/photo clip, like a film strip. */
function ThumbStrip({
  clip,
  asset,
  widthPx,
  height,
  pxPerSecond,
}: {
  clip: MediaClip;
  asset: MediaAsset;
  widthPx: number;
  height: number;
  pxPerSecond: number;
}) {
  const aspect = asset.width && asset.height ? asset.width / asset.height : 9 / 16;
  const tile = Math.min(96, Math.max(24, height * aspect));
  const count = Math.min(MAX_THUMBS, Math.max(1, Math.ceil(widthPx / tile)));
  return (
    <div className="pointer-events-none absolute inset-0 flex overflow-hidden opacity-90">
      {Array.from({ length: count }, (_, i) => {
        const offset = ((i + 0.5) * tile) / pxPerSecond;
        const seconds = usToSeconds(clip.sourceIn) + offset * clip.speed;
        return <Thumb key={i} assetId={asset.id} seconds={seconds} width={tile} />;
      })}
    </div>
  );
}

/** Punch-ins on a clip: gold bars along the top, one per punch. */
function PunchMarks({ clip, pxPerSecond }: { clip: MediaClip; pxPerSecond: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5">
      {visiblePunches(clip).map((p) => {
        const [start, end] = punchSpan(clip, p);
        const left = usToSeconds(start - clip.start) * pxPerSecond;
        const width = Math.max(4, usToSeconds(Math.min(end, clip.start + clip.duration) - start) * pxPerSecond);
        return <span key={p.id} className="absolute top-0 h-1.5 rounded-b-sm bg-gold shadow-[0_0_6px_rgba(226,191,126,0.8)]" style={{ left, width }} />;
      })}
    </div>
  );
}

function ClipBlock({
  clip,
  asset,
  label,
  kind,
  pxPerSecond,
  selected,
  onSelect,
  drag,
}: {
  clip: Clip;
  asset?: MediaAsset;
  label: string;
  kind: TrackKind;
  pxPerSecond: number;
  selected: boolean;
  onSelect: (id: string) => void;
  drag: DragHandlers;
}) {
  const { height, clipClass } = LANE_STYLE[kind];
  const widthPx = Math.max(2, usToSeconds(clip.duration) * pxPerSecond);
  const filmstrip = clip.type === "media" && asset && asset.kind !== "audio";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
      onPointerDown={selected ? (e) => drag.start(e, clip, "move") : undefined}
      onPointerMove={drag.move}
      onPointerUp={drag.end}
      onPointerCancel={drag.end}
      className={cn(
        "absolute inset-y-0 overflow-hidden rounded-md border border-black/40 px-2 text-left text-[11px] font-medium text-white",
        clipClass,
        selected && "z-10 overflow-visible ring-2 ring-white",
        selected && "cursor-grab touch-none",
      )}
      style={{ left: usToSeconds(clip.start) * pxPerSecond, width: widthPx }}
    >
      {clip.type === "media" && asset?.kind === "audio" && (
        <Waveform clip={clip} assetId={asset.id} widthPx={widthPx} height={height} pxPerSecond={pxPerSecond} />
      )}
      {filmstrip ? (
        <>
          <ThumbStrip clip={clip} asset={asset} widthPx={widthPx} height={height} pxPerSecond={pxPerSecond} />
          <span className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded bg-black/55 px-1.5 text-[10px] leading-4 text-white/90 backdrop-blur-sm">
            {label}
          </span>
        </>
      ) : (
        <span className="block truncate" style={{ lineHeight: `${height}px` }}>
          {label}
        </span>
      )}
      {clip.type === "media" && clip.zoom.punches.length > 0 && <PunchMarks clip={clip} pxPerSecond={pxPerSecond} />}
      {selected &&
        (["start", "end"] as const).map((edge) => (
          <div
            key={edge}
            aria-label={edge === "start" ? "Trim start" : "Trim end"}
            onPointerDown={(e) => drag.start(e, clip, edge)}
            onPointerMove={drag.move}
            onPointerUp={drag.end}
            onPointerCancel={drag.end}
            className={cn(
              "absolute inset-y-0 flex w-4 cursor-ew-resize touch-none items-center justify-center bg-white",
              edge === "start" ? "-left-4 rounded-l-md" : "-right-4 rounded-r-md",
            )}
          >
            <div className="h-1/2 w-0.5 rounded bg-neutral-500" />
          </div>
        ))}
    </div>
  );
}
