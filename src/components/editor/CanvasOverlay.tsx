"use client";

import { Crop, Pencil, RotateCw, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { clipAt, findClip, getTrack } from "@/engine/model/ops";
import type { Clip, MediaClip, Project, TextClip } from "@/engine/model/project";
import { frameTime, visibleOverlayClips, visibleTextClips } from "@/engine/render/compose";
import { mediaBox } from "@/engine/render/media";
import { layoutText } from "@/engine/render/text";
import { fontFamilyFor } from "@/lib/fonts";
import { capturePointer } from "@/lib/pointer";
import { cn } from "@/lib/utils";
import { requestDeleteSelected, updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";

const HIT_SLOP_PX = 24;
/** Screen-pixel space between an item and its selection box, so handles don't cover it. */
const BOX_PADDING_PX = 12;
const CENTER_SNAP = 0.015;
const ROTATION_SNAP_DEG = 4;
const DOUBLE_TAP_MS = 350;

let measureCtx: CanvasRenderingContext2D | null = null;

/** Something on the canvas you can grab: text, an overlay, or the main video/photo. */
interface Item {
  clip: Clip;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Size in canvas pixels before `scale`. */
  w: number;
  h: number;
}

function textItem(clip: TextClip, W: number): Item {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const layout = measureCtx ? layoutText(measureCtx, clip, W, fontFamilyFor) : { boxWidth: 0, boxHeight: 0 };
  const t = clip.transform;
  return { clip, x: t.x, y: t.y, scale: t.scale, rotation: t.rotation, w: layout.boxWidth, h: layout.boxHeight };
}

function mediaItem(clip: MediaClip, project: Project): Item {
  const { width: W, height: H } = project.canvas;
  const box = mediaBox(clip, project.assets[clip.assetId], W, H);
  const f = clip.frame;
  return { clip, x: f.x, y: f.y, scale: f.scale, rotation: f.rotation, w: box.w, h: box.h };
}

/** Grabbable items at time `t`, bottom-most first. */
function itemsAt(project: Project, t: number): Item[] {
  const items: Item[] = [];
  const main = getTrack(project, "main");
  const mainClip = main && !main.hidden ? clipAt(main, frameTime(project, t)) : undefined;
  if (mainClip?.type === "media" && project.assets[mainClip.assetId]?.kind !== "audio") {
    items.push(mediaItem(mainClip, project));
  }
  for (const overlay of visibleOverlayClips(project, t)) items.push(mediaItem(overlay, project));
  for (const text of visibleTextClips(project, t)) items.push(textItem(text, project.canvas.width));
  return items;
}

/** Writes a new position/size/rotation to a text transform or a media frame. */
function place(clip: Clip, values: Partial<Pick<Item, "x" | "y" | "scale" | "rotation">>) {
  if (clip.type === "text") Object.assign(clip.transform, values);
  else Object.assign(clip.frame, values);
}

type Gesture =
  | { kind: "move"; clipId: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: "transform"; clipId: string; startDist: number; startAngle: number; origScale: number; origRotation: number };

/**
 * Direct manipulation on the preview for text, stickers, overlays and the main video:
 * tap to select, drag to move, corner handle to resize/rotate, double-tap to edit.
 */
export function CanvasOverlay() {
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const playing = useEditor((s) => s.playing);
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef({ id: "", time: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });
  // Re-measure once web fonts finish loading.
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    document.fonts.addEventListener("loadingdone", refresh);
    return () => document.fonts.removeEventListener("loadingdone", refresh);
  }, []);

  const { width: W, height: H } = project.canvas;
  const items = itemsAt(project, playhead);
  const selected = playing ? undefined : items.find((i) => i.clip.id === selectedClipId);

  const toCanvas = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, rect: r };
  };

  const hitTest = (x: number, y: number): Item | undefined =>
    [...items].reverse().find((item) => {
      const dx = (x - item.x) * W;
      const dy = (y - item.y) * H;
      const rad = (-item.rotation * Math.PI) / 180;
      const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / item.scale;
      const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / item.scale;
      return Math.abs(lx) <= item.w / 2 + HIT_SLOP_PX && Math.abs(ly) <= item.h / 2 + HIT_SLOP_PX;
    });

  const openEditor = (clip: Clip) => useEditor.getState().openPanel(clip.type === "text" ? "edit" : "crop");

  const onPointerDown = (e: React.PointerEvent) => {
    const s = useEditor.getState();
    if (s.playing) {
      s.pause();
      return;
    }
    const p = toCanvas(e);
    const hit = hitTest(p.x, p.y);
    if (!hit) {
      s.select(null);
      return;
    }
    if (hit.clip.id !== s.selectedClipId) s.select(hit.clip.id);
    if (lastTap.current.id === hit.clip.id && e.timeStamp - lastTap.current.time < DOUBLE_TAP_MS) openEditor(hit.clip);
    lastTap.current = { id: hit.clip.id, time: e.timeStamp };

    gesture.current = { kind: "move", clipId: hit.clip.id, startX: p.x, startY: p.y, origX: hit.x, origY: hit.y };
    capturePointer(ref.current, e.pointerId);
  };

  const startTransform = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!selected) return;
    const r = ref.current!.getBoundingClientRect();
    const cx = r.left + selected.x * r.width;
    const cy = r.top + selected.y * r.height;
    capturePointer(ref.current, e.pointerId);
    gesture.current = {
      kind: "transform",
      clipId: selected.clip.id,
      startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)),
      startAngle: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
      origScale: selected.scale,
      origRotation: selected.rotation,
    };
  };

  const update = (clipId: string, label: string, values: Parameters<typeof place>[1]) =>
    updateProject(
      label,
      (d) => {
        const clip = findClip(d, clipId)?.clip;
        if (clip) place(clip, values);
      },
      "manual",
    );

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const p = toCanvas(e);
    if (g.kind === "move") {
      let x = g.origX + (p.x - g.startX);
      let y = g.origY + (p.y - g.startY);
      const snapX = Math.abs(x - 0.5) < CENTER_SNAP;
      const snapY = Math.abs(y - 0.5) < CENTER_SNAP;
      if (snapX) x = 0.5;
      if (snapY) y = 0.5;
      setGuides({ x: snapX, y: snapY });
      update(g.clipId, "Move", { x, y });
    } else {
      const item = itemsAt(useEditor.getState().project, useEditor.getState().playhead).find((i) => i.clip.id === g.clipId);
      if (!item) return;
      const cx = p.rect.left + item.x * p.rect.width;
      const cy = p.rect.top + item.y * p.rect.height;
      const scale = Math.min(8, Math.max(0.1, (g.origScale * Math.hypot(e.clientX - cx, e.clientY - cy)) / g.startDist));
      let rotation = g.origRotation + (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI - g.startAngle;
      rotation = ((((rotation + 180) % 360) + 360) % 360) - 180;
      const nearest = Math.round(rotation / 90) * 90;
      if (Math.abs(rotation - nearest) < ROTATION_SNAP_DEG) rotation = nearest;
      update(g.clipId, "Resize", { scale, rotation });
    }
  };

  const endGesture = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setGuides({ x: false, y: false });
    useEditor.getState().commitLive();
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {guides.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gold" />}
      {guides.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gold" />}

      {selected && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{
            left: `${selected.x * 100}%`,
            top: `${selected.y * 100}%`,
            width: `calc(${((selected.w * selected.scale) / W) * 100}% + ${BOX_PADDING_PX * 2}px)`,
            height: `calc(${((selected.h * selected.scale) / H) * 100}% + ${BOX_PADDING_PX * 2}px)`,
            transform: `translate(-50%, -50%) rotate(${selected.rotation}deg)`,
          }}
        >
          <Handle className="-top-3.5 -left-3.5" label="Delete" onPointerDown={(e) => e.stopPropagation()} onClick={requestDeleteSelected}>
            <X />
          </Handle>
          <Handle
            className="-top-3.5 -right-3.5"
            label={selected.clip.type === "text" ? "Edit text" : "Crop"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => openEditor(selected.clip)}
          >
            {selected.clip.type === "text" ? <Pencil /> : <Crop />}
          </Handle>
          <Handle className="-right-3.5 -bottom-3.5 touch-none" label="Resize and rotate" onPointerDown={startTransform}>
            <RotateCw />
          </Handle>
        </div>
      )}
    </div>
  );
}

function Handle({
  className,
  label,
  onPointerDown,
  onClick,
  children,
}: {
  className: string;
  label: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        "pointer-events-auto absolute flex size-7 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md [&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </button>
  );
}
