"use client";

import { Blend, Eye, EyeOff, Palette, Volume2, VolumeX } from "lucide-react";
import { gradeParams } from "@/engine/model/color";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { clipEnd, getTrack, moveClip, projectDuration, reorderClip, setTrackFlag, trimClip, visiblePunches } from "@/engine/model/ops";
import { audioReadyVersion, onAudioReady, thumbnailUrl, waveform } from "@/engine/media/registry";
import type { Clip, MediaAsset, MediaClip, Project, Track, TrackKind } from "@/engine/model/project";
import { formatTimecode, secondsToUs, usToSeconds, type Micros } from "@/engine/model/time";
import { punchSpan } from "@/engine/model/zoom";
import { capturePointer } from "@/lib/pointer";
import { clipsTouch } from "@/engine/render/transitions";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { addAssetToTimeline } from "@/store/actions";
import { useEditor } from "@/store/editor";

/** Drag type for a file dragged out of the studio media library (its asset id). */
export const ASSET_DRAG_TYPE = "application/x-framewell-asset";

/** Files from the computer dropped on a lane: detail is { files, at, prefer } (see Editor). */
export const DROP_FILES_EVENT = "framewell:drop-files";

const LANE_STYLE: Record<TrackKind, { height: number; clipClass: string }> = {
  text: { height: 30, clipClass: "bg-[#8f7447]" },
  caption: { height: 30, clipClass: "bg-[#5d6b80]" },
  overlay: { height: 40, clipClass: "bg-[#4d5a52]" },
  main: { height: 52, clipClass: "bg-[#3a4757]" },
  audio: { height: 32, clipClass: "bg-[#35574a]" },
};

type Translate = ReturnType<typeof useT>;

/** Lanes are taller in the desktop studio, where there is room. */
const STUDIO_SCALE = 1.55;
/** Studio: space before time 0 on the left of the lanes. */
const STUDIO_PAD = 16;
const laneHeight = (kind: TrackKind, studio: boolean) => Math.round(LANE_STYLE[kind].height * (studio ? STUDIO_SCALE : 1));
/** Space above the lanes: scroll padding (py-2) + ruler (h-6) + its margin (mb-1). */
const RULER_BLOCK_PX = 8 + 24 + 4;

const TICK_STEPS_S = [0.5, 1, 2, 5, 10, 15, 30, 60, 120];
const MIN_TICK_SPACING_PX = 56;
const SNAP_PX = 8;

function tickLabel(seconds: number, t: Translate): string {
  if (seconds < 60) return t("editor.timeline.seconds", { seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clipLabel(project: Project, clip: Clip, t: Translate): string {
  return clip.type === "media" ? (project.assets[clip.assetId]?.name ?? t("editor.timeline.clip")) : clip.text || t("editor.timeline.text");
}

/** Text lanes stack above the main track (newest on top), audio below. */
function laneOrder(project: Project): Track[] {
  const of = (kind: TrackKind) => project.tracks.filter((track) => track.kind === kind);
  return [...of("text").reverse(), ...of("caption"), ...of("overlay"), ...of("main"), ...of("audio")];
}

type Drag = {
  clipId: string;
  mode: "move" | "start" | "end";
  startX: number;
  origStart: Micros;
  origEnd: Micros;
  /** Other selected clips, moved by the same amount (multi-selection). */
  others: { id: string; start: Micros }[];
};

/**
 * Phones: the playhead is fixed in the centre and the timeline scrolls underneath it, so the
 * scroll position *is* the playhead (`scrollLeft = seconds × pxPerSecond`).
 * Desktop studio (`studio`): a classic editor timeline. Time 0 is at the left, the playhead
 * moves (click anywhere or drag its handle), the view follows it while playing, Ctrl/⌘ + wheel
 * zooms around the mouse, and a line under the mouse shows its time.
 * Selected clips get trim handles and can be dragged to a new time (or, on a magnetic main
 * track, to a new position in the order).
 */
export function Timeline({ studio = false }: { studio?: boolean }) {
  const t = useT();
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const multi = useEditor((s) => s.multi);
  const select = useEditor((s) => s.select);
  const setPlayhead = useEditor((s) => s.setPlayhead);
  const setZoom = useEditor((s) => s.setZoom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headersRef = useRef<HTMLDivElement>(null);
  const [dropLane, setDropLane] = useState<string | null>(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const synced = useRef({ playhead: -1, pxPerSecond: 0, halfWidth: 0 });
  const pinch = useRef<{ distance: number; pxPerSecond: number } | null>(null);
  const drag = useRef<Drag | null>(null);

  const hoverRef = useRef<HTMLDivElement>(null);
  /** Studio box select: where the drag started (content px) and the box drawn so far. */
  const box = useRef<{ x: number; y: number; add: boolean; moved: boolean; pointerId: number } | null>(null);
  const [boxRect, setBoxRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  /** A box select just ended: the click that follows must not move the playhead or deselect. */
  const swallowClick = useRef(false);
  /** Position inside the scrolling content, for a client point. */
  const contentPoint = (clientX: number, clientY: number) => {
    const el = scrollRef.current!;
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left + el.scrollLeft, y: clientY - r.top + el.scrollTop };
  };
  const onBoxStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!studio || e.button !== 0 || target.closest("[data-clip-id], [data-ruler], button, [role=slider]")) return;
    const p = contentPoint(e.clientX, e.clientY);
    box.current = { ...p, add: e.shiftKey || e.ctrlKey || e.metaKey, moved: false, pointerId: e.pointerId };
  };
  const onBoxMove = (e: React.PointerEvent) => {
    const b = box.current;
    if (!b) return;
    const p = contentPoint(e.clientX, e.clientY);
    if (!b.moved && Math.hypot(p.x - b.x, p.y - b.y) < 5) return;
    if (!b.moved) capturePointer(scrollRef.current, b.pointerId);
    b.moved = true;
    setBoxRect({ left: Math.min(b.x, p.x), top: Math.min(b.y, p.y), width: Math.abs(p.x - b.x), height: Math.abs(p.y - b.y) });
  };
  const onBoxEnd = (e: React.PointerEvent) => {
    const b = box.current;
    box.current = null;
    if (!b?.moved) return;
    swallowClick.current = true;
    setBoxRect(null);
    // Every clip the box touches, compared on screen.
    const el = scrollRef.current!;
    const r = el.getBoundingClientRect();
    const p = contentPoint(e.clientX, e.clientY);
    const x1 = r.left - el.scrollLeft + Math.min(b.x, p.x);
    const x2 = r.left - el.scrollLeft + Math.max(b.x, p.x);
    const y1 = r.top - el.scrollTop + Math.min(b.y, p.y);
    const y2 = r.top - el.scrollTop + Math.max(b.y, p.y);
    const hits = [...el.querySelectorAll<HTMLElement>("[data-clip-id]")]
      .filter((node) => {
        const c = node.getBoundingClientRect();
        return c.right > x1 && c.left < x2 && c.bottom > y1 && c.top < y2;
      })
      .map((node) => node.dataset.clipId!);
    const s = useEditor.getState();
    const current = b.add && s.selectedClipId ? [s.selectedClipId, ...s.multi] : [];
    const ids = [...new Set([...current, ...hits])];
    if (ids.length) s.selectMany(ids);
    else if (!b.add) s.select(null);
  };
  const durationPx = usToSeconds(projectDuration(project)) * pxPerSecond;
  const tickStep = TICK_STEPS_S.find((s) => s * pxPerSecond >= MIN_TICK_SPACING_PX) ?? 300;
  /** Space before time 0: half the view on phones (so 0 can reach the centre line), a margin in the studio. */
  const pad = studio ? STUDIO_PAD : halfWidth;
  // Studio: always at least a screen wide, with room after the end to drag clips into.
  const contentWidth = studio ? Math.max(halfWidth * 2, durationPx + pad + halfWidth) : durationPx + halfWidth * 2;
  const tickCount = Math.floor((contentWidth - pad) / (tickStep * pxPerSecond)) + 1;
  /** Timeline time under a client x position (studio). */
  const timeAtClientX = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const x = clientX - el.getBoundingClientRect().left + el.scrollLeft - pad;
    return secondsToUs(Math.max(0, x) / pxPerSecond);
  };

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
    if (!studio) {
      el.scrollLeft = usToSeconds(playhead) * pxPerSecond;
      return;
    }
    // Studio: keep the playhead in view (page along while playing, jump to it after a key press).
    const x = STUDIO_PAD + usToSeconds(playhead) * pxPerSecond;
    const margin = 48;
    if (x < el.scrollLeft + margin || x > el.scrollLeft + el.clientWidth - margin) {
      el.scrollLeft = useEditor.getState().playing ? x - margin : x - el.clientWidth / 3;
    }
  }, [playhead, pxPerSecond, halfWidth, studio]);

  // Ctrl/⌘ + wheel (and trackpad pinch) zooms on desktop. Needs a non-passive listener.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { pxPerSecond: px, setZoom: zoom } = useEditor.getState();
        if (!studio) {
          zoom(px * Math.exp(-e.deltaY * 0.01));
          return;
        }
        // Studio: zoom around the mouse, so the moment under it stays put.
        const mouseX = e.clientX - el.getBoundingClientRect().left;
        const seconds = (el.scrollLeft + mouseX - STUDIO_PAD) / px;
        zoom(px * Math.exp(-e.deltaY * 0.01));
        requestAnimationFrame(() => {
          el.scrollLeft = seconds * useEditor.getState().pxPerSecond + STUDIO_PAD - mouseX;
        });
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
  }, [studio]);

  const onScroll = () => {
    const el = scrollRef.current;
    // Track headers follow the lanes up and down.
    if (el && headersRef.current) headersRef.current.scrollTop = el.scrollTop;
    // In the studio, scrolling only looks around; the playhead stays where it is.
    if (!el || studio || useEditor.getState().playing) return;
    setPlayhead(secondsToUs(el.scrollLeft / pxPerSecond));
    synced.current = { playhead: useEditor.getState().playhead, pxPerSecond, halfWidth };
  };

  const touchDistance = (e: React.TouchEvent) =>
    Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  /** Snaps a time to the playhead, zero or any other clip edge within SNAP_PX. */
  const snap = (at: Micros, ignoreId: string): Micros => {
    const s = useEditor.getState();
    if (!s.snapping) return at;
    const threshold = (SNAP_PX / pxPerSecond) * 1_000_000;
    const targets = [0, s.playhead, ...s.project.markers];
    for (const track of s.project.tracks) {
      for (const c of track.clips) if (c.id !== ignoreId) targets.push(c.start, clipEnd(c));
    }
    let best = at;
    let bestDist = threshold;
    for (const target of targets) {
      const d = Math.abs(target - at);
      if (d < bestDist) {
        best = target;
        bestDist = d;
      }
    }
    return best;
  };

  const startDrag = (e: React.PointerEvent, clip: Clip, mode: Drag["mode"]) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = useEditor.getState();
    s.pause();
    const others =
      mode === "move"
        ? [s.selectedClipId, ...s.multi]
            .filter((id): id is string => Boolean(id) && id !== clip.id)
            .flatMap((id) => {
              const c = s.project.tracks.flatMap((tr) => tr.clips).find((x) => x.id === id);
              return c ? [{ id, start: c.start }] : [];
            })
        : [];
    drag.current = { clipId: clip.id, mode, startX: e.clientX, origStart: clip.start, origEnd: clipEnd(clip), others };
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
      let at = 0;
      let index = 0;
      for (const c of main.clips) {
        if (c.id === d.clipId) continue;
        if (at + c.duration / 2 < middle) index++;
        at += c.duration;
      }
      live(t("editor.undo.reorderClip"), (draft) => reorderClip(draft, d.clipId, index));
      return;
    }
    if (d.mode === "move") {
      // Snap whichever edge is closer to a target.
      const raw = d.origStart + delta;
      const duration = d.origEnd - d.origStart;
      const byStart = snap(raw, d.clipId) - raw;
      const byEnd = snap(raw + duration, d.clipId) - (raw + duration);
      const correction = byStart !== 0 && (byEnd === 0 || Math.abs(byStart) <= Math.abs(byEnd)) ? byStart : byEnd;
      const moved = raw + correction - d.origStart;
      live(d.others.length ? t("editor.many.undo.moveMany") : t("editor.undo.moveClip"), (draft) => {
        moveClip(draft, d.clipId, raw + correction);
        // The rest of the selection keeps its distance from the dragged clip.
        for (const other of d.others) moveClip(draft, other.id, other.start + moved);
      });
    } else {
      const edgeTime = snap((d.mode === "start" ? d.origStart : d.origEnd) + delta, d.clipId);
      live(t("editor.undo.trimClip"), (draft) => trimClip(draft, d.clipId, d.mode as "start" | "end", edgeTime));
    }
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    useEditor.getState().commitLive();
  };

  const dragHandlers: DragHandlers = { start: startDrag, move: onDragMove, end: endDrag };

  const lanes = laneOrder(project);

  return (
    <div
      dir="ltr"
      data-timeline
      className={cn("select-none border-t border-white/[0.06] bg-[#0e0e11]", studio ? "flex h-full min-h-0" : "relative")}
    >
      {studio && <TrackHeaders refEl={headersRef} lanes={lanes} />}
      <div className={cn("relative", studio && "h-full min-w-0 flex-1")}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={(e) => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          select(null);
          if (studio) setPlayhead(timeAtClientX(e.clientX));
        }}
        onPointerDownCapture={onBoxStart}
        onPointerMoveCapture={onBoxMove}
        onPointerUpCapture={onBoxEnd}
        onMouseMove={
          studio
            ? (e) => {
                // A thin line under the mouse with its time, like any desktop editor.
                const el = scrollRef.current;
                const hover = hoverRef.current;
                if (!el || !hover) return;
                const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft;
                hover.style.display = x >= pad ? "block" : "none";
                hover.style.left = `${x}px`;
                hover.firstElementChild!.textContent = formatTimecode(timeAtClientX(e.clientX), project.canvas.fps);
              }
            : undefined
        }
        onMouseLeave={studio ? () => hoverRef.current && (hoverRef.current.style.display = "none") : undefined}
        onContextMenu={(e) => {
          e.preventDefault();
          useEditor.getState().openContextMenu({ x: e.clientX, y: e.clientY });
        }}
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
        className={cn(
          "overflow-x-auto overflow-y-auto py-2",
          studio
            ? "h-full [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]"
            : "max-h-56 [scrollbar-width:none] md:max-h-72 [&::-webkit-scrollbar]:hidden",
        )}
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div className="relative" style={{ width: contentWidth, paddingInlineStart: pad, paddingInlineEnd: studio ? 0 : halfWidth }}>
          {/* Beat markers: a gold tick on the ruler and a faint line through the lanes */}
          {project.markers.map((m) => (
            <div
              key={m}
              className="pointer-events-none absolute inset-y-0 w-px bg-gold/25"
              style={{ left: pad + usToSeconds(m) * pxPerSecond }}
            >
              <div className="absolute top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-gold" />
            </div>
          ))}

          {boxRect && (
            <div
              className="pointer-events-none absolute z-40 rounded-sm border border-gold/80 bg-gold/10"
              style={{ left: boxRect.left, top: boxRect.top - 8, width: boxRect.width, height: boxRect.height }}
            />
          )}

          {/* Ruler: click anywhere on it to jump there */}
          <div
            data-ruler
            className="relative mb-1 h-6 cursor-pointer text-[10px] text-neutral-500"
            title={t("editor.timeline.rulerHint")}
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
                {tickLabel(i * tickStep, t)}
              </div>
            ))}
          </div>

          {studio && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 z-30 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_8px_rgba(226,191,126,0.6)]"
                style={{ left: pad + usToSeconds(playhead) * pxPerSecond }}
              >
                <div
                  role="slider"
                  aria-label={t("editor.timeline.playhead")}
                  aria-valuenow={Math.round(usToSeconds(playhead) * 10) / 10}
                  className="pointer-events-auto absolute -top-2 left-1/2 flex h-5 w-3.5 -translate-x-1/2 cursor-ew-resize items-end justify-center rounded-b-sm rounded-t-[3px] bg-gold"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    useEditor.getState().pause();
                    const el = e.currentTarget;
                    capturePointer(el, e.pointerId);
                    const move = (ev: PointerEvent) => setPlayhead(timeAtClientX(ev.clientX));
                    const up = () => {
                      el.removeEventListener("pointermove", move);
                      el.removeEventListener("pointerup", up);
                      el.removeEventListener("pointercancel", up);
                    };
                    el.addEventListener("pointermove", move);
                    el.addEventListener("pointerup", up);
                    el.addEventListener("pointercancel", up);
                  }}
                />
              </div>
              <div ref={hoverRef} className="pointer-events-none absolute inset-y-0 z-20 hidden w-px bg-white/25">
                <span className="absolute top-0 left-1 rounded bg-black/80 px-1 font-mono text-[10px] leading-4 text-neutral-200" />
              </div>
            </>
          )}

          {lanes.map((track) => (
            <div
              key={track.id}
              className={cn("relative mb-1 rounded-md", track.hidden && "opacity-40", dropLane === track.id && "bg-gold/10 ring-1 ring-gold/50")}
              style={{ height: laneHeight(track.kind, studio) }}
              onDragOver={(e) => {
                const files = studio && e.dataTransfer.types.includes("Files");
                if (!e.dataTransfer.types.includes(ASSET_DRAG_TYPE) && !files) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDropLane(track.id);
              }}
              onDragLeave={() => setDropLane((id) => (id === track.id ? null : id))}
              onDrop={(e) => {
                const assetId = e.dataTransfer.getData(ASSET_DRAG_TYPE);
                const files = studio ? [...e.dataTransfer.files] : [];
                setDropLane(null);
                if (!assetId && files.length === 0) return;
                e.preventDefault();
                e.stopPropagation();
                const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
                const at = secondsToUs(Math.max(0, x) / pxPerSecond);
                const prefer = track.kind === "overlay" ? "overlay" : "main";
                if (assetId) addAssetToTimeline(assetId, at, prefer);
                // The editor imports them (with its progress and error messages), placed here.
                else window.dispatchEvent(new CustomEvent(DROP_FILES_EVENT, { detail: { files, at, prefer } }));
              }}
            >
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
                  label={clipLabel(project, clip, t)}
                  kind={track.kind}
                  height={laneHeight(track.kind, studio)}
                  pxPerSecond={pxPerSecond}
                  selected={selectedClipId === clip.id || multi.includes(clip.id)}
                  primary={selectedClipId === clip.id}
                  onSelect={(id, add) => (add ? useEditor.getState().toggleSelect(id) : select(id))}
                  drag={dragHandlers}
                  studio={studio}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed centre playhead (phones) */}
      {!studio && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_8px_rgba(226,191,126,0.6)]">
          <div className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-gold" />
        </div>
      )}
      </div>
    </div>
  );
}

/**
 * Desktop studio: a column beside the lanes naming each track, with mute and hide switches.
 * Scrolled together with the lanes (see onScroll).
 */
function TrackHeaders({ refEl, lanes }: { refEl: React.RefObject<HTMLDivElement | null>; lanes: Track[] }) {
  const t = useT();
  const count: Partial<Record<TrackKind, number>> = {};
  const numberOf = new Map<string, number>();
  for (const track of [...lanes].reverse()) numberOf.set(track.id, (count[track.kind] = (count[track.kind] ?? 0) + 1));

  const toggle = (track: Track, flag: "muted" | "hidden") => {
    const on = !track[flag];
    const label =
      flag === "hidden"
        ? t(on ? "editor.studio.undo.hideTrack" : "editor.studio.undo.showTrack")
        : t(on ? "editor.studio.undo.muteTrack" : "editor.studio.undo.unmuteTrack");
    useEditor.getState().edit(label, (d) => setTrackFlag(d, track.id, flag, on));
  };

  return (
    <div ref={refEl} className="w-32 shrink-0 overflow-hidden border-e border-white/[0.06] bg-[#0b0b0e]">
      <div style={{ height: RULER_BLOCK_PX }} />
      {lanes.map((track) => {
        const n = numberOf.get(track.id) ?? 1;
        const name =
          track.kind === "main" || track.kind === "caption"
            ? t(`editor.studio.track.${track.kind}`)
            : t(`editor.studio.track.${track.kind}`, { n });
        const audible = track.kind === "main" || track.kind === "overlay" || track.kind === "audio";
        const visual = track.kind !== "audio";
        return (
          <div
            key={track.id}
            className="mb-1 flex items-center gap-0.5 ps-3 pe-1 text-xs text-neutral-400"
            style={{ height: laneHeight(track.kind, true) }}
          >
            <span className={cn("min-w-0 flex-1 truncate", track.hidden && "line-through opacity-60")}>{name}</span>
            {audible && (
              <button
                type="button"
                aria-label={t(track.muted ? "editor.studio.track.unmute" : "editor.studio.track.mute")}
                title={t(track.muted ? "editor.studio.track.unmute" : "editor.studio.track.mute")}
                aria-pressed={track.muted}
                onClick={() => toggle(track, "muted")}
                className={cn("flex size-6 items-center justify-center rounded hover:bg-white/10 [&_svg]:size-3.5", track.muted && "text-red-300")}
              >
                {track.muted ? <VolumeX /> : <Volume2 />}
              </button>
            )}
            {visual && (
              <button
                type="button"
                aria-label={t(track.hidden ? "editor.studio.track.show" : "editor.studio.track.hide")}
                title={t(track.hidden ? "editor.studio.track.show" : "editor.studio.track.hide")}
                aria-pressed={track.hidden}
                onClick={() => toggle(track, "hidden")}
                className={cn("flex size-6 items-center justify-center rounded hover:bg-white/10 [&_svg]:size-3.5", track.hidden && "text-gold")}
              >
                {track.hidden ? <EyeOff /> : <Eye />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Button on the cut between two main-track clips; opens the transition panel. */
function TransitionMarker({ clip, pxPerSecond }: { clip: Clip; pxPerSecond: number }) {
  const t = useT();
  const has = clip.type === "media" && clip.transition !== null;
  return (
    <button
      type="button"
      aria-label={has ? t("editor.timeline.editTransition") : t("editor.timeline.addTransition")}
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

/** Small signs on a desktop clip: its speed, a colour change, sound off. */
function ClipBadges({ clip }: { clip: MediaClip }) {
  const t = useT();
  const badges: { key: string; title: string; content: React.ReactNode }[] = [];
  if (clip.speed !== 1) badges.push({ key: "speed", title: t("editor.studio.badgeSpeed", { value: String(clip.speed) }), content: `${clip.speed}×` });
  if (gradeParams(clip.color)) badges.push({ key: "color", title: t("editor.studio.badgeColor"), content: <Palette className="size-3" /> });
  if (clip.volume === 0) badges.push({ key: "muted", title: t("editor.studio.badgeMuted"), content: <VolumeX className="size-3" /> });
  if (badges.length === 0) return null;
  return (
    <span className="pointer-events-none absolute top-1 right-1 flex gap-0.5">
      {badges.map((b) => (
        <span key={b.key} title={b.title} className="flex h-4 min-w-4 items-center justify-center rounded bg-black/65 px-1 text-[10px] font-semibold leading-none text-white/90">
          {b.content}
        </span>
      ))}
    </span>
  );
}

function ClipBlock({
  clip,
  asset,
  label,
  kind,
  height,
  pxPerSecond,
  selected,
  primary,
  onSelect,
  drag,
  studio = false,
}: {
  clip: Clip;
  asset?: MediaAsset;
  label: string;
  kind: TrackKind;
  height: number;
  pxPerSecond: number;
  selected: boolean;
  /** The selected clip the panels edit (the others are part of a multi-selection). */
  primary: boolean;
  /** `add`: Shift/Ctrl/⌘-click, adding the clip to the selection (or taking it out). */
  onSelect: (id: string, add: boolean) => void;
  drag: DragHandlers;
  /** Desktop: badges (speed, colour, muted) and the sound's waveform on video clips. */
  studio?: boolean;
}) {
  const t = useT();
  const { clipClass } = LANE_STYLE[kind];
  const widthPx = Math.max(2, usToSeconds(clip.duration) * pxPerSecond);
  const filmstrip = clip.type === "media" && asset && asset.kind !== "audio";
  return (
    <div
      role="button"
      tabIndex={0}
      data-clip-id={clip.id}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected) onSelect(clip.id, false);
        useEditor.getState().openContextMenu({ x: e.clientX, y: e.clientY });
      }}
      onPointerDown={selected ? (e) => drag.start(e, clip, "move") : undefined}
      onPointerMove={drag.move}
      onPointerUp={drag.end}
      onPointerCancel={drag.end}
      className={cn(
        "absolute inset-y-0 overflow-hidden rounded-md border border-black/40 px-2 text-left text-[11px] font-medium text-white",
        clipClass,
        selected && "z-10 overflow-visible ring-2",
        selected && (primary ? "ring-white" : "ring-gold/80"),
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
          {studio && clip.type === "media" && asset.hasAudio && clip.volume > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-black/45">
              <Waveform clip={clip} assetId={asset.id} widthPx={widthPx} height={Math.round(height * 0.34)} pxPerSecond={pxPerSecond} />
            </div>
          )}
          {studio && clip.type === "media" && <ClipBadges clip={clip} />}
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
            aria-label={edge === "start" ? t("editor.timeline.trimStart") : t("editor.timeline.trimEnd")}
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
