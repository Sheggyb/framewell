"use client";

import { useRef } from "react";
import { findClip } from "@/engine/model/ops";
import type { CropRect, MediaClip } from "@/engine/model/project";
import { cropStage } from "@/engine/render/media";
import { updateProject } from "@/store/actions";
import { capturePointer } from "@/lib/pointer";
import { useEditor } from "@/store/editor";

const MIN_SIZE = 0.05;
type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

type Drag =
  | { kind: "move"; startX: number; startY: number; orig: CropRect }
  | { kind: "corner"; corner: Corner; orig: CropRect };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Crop editor drawn over the full, uncropped source: drag the box to move it, drag a corner
 * to resize (locked to the chosen aspect ratio, if any). Outside the box is dimmed.
 */
export function CropOverlay({ clip }: { clip: MediaClip }) {
  const project = useEditor((s) => s.project);
  const aspect = useEditor((s) => s.cropAspect);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const { width: W, height: H } = project.canvas;
  const asset = project.assets[clip.assetId];
  const stage = cropStage(asset, W, H);
  const sourceAspect = (asset?.width ?? W) / (asset?.height ?? H);
  const { crop } = clip;

  // Pointer position as a fraction of the source image.
  const toSource = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * W;
    const cy = ((e.clientY - r.top) / r.height) * H;
    return { x: (cx - stage.x) / stage.w, y: (cy - stage.y) / stage.h };
  };

  const setCrop = (next: CropRect) =>
    updateProject(
      "Crop",
      (d) => {
        const c = findClip(d, clip.id)?.clip;
        if (c?.type === "media") c.crop = next;
      },
      "manual",
    );

  const onPointerDown = (e: React.PointerEvent, corner?: Corner) => {
    e.stopPropagation();
    const p = toSource(e);
    drag.current = corner ? { kind: "corner", corner, orig: crop } : { kind: "move", startX: p.x, startY: p.y, orig: crop };
    capturePointer(ref.current, e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSource(e);
    const o = d.orig;
    if (d.kind === "move") {
      setCrop({
        ...o,
        x: clamp(o.x + (p.x - d.startX), 0, 1 - o.w),
        y: clamp(o.y + (p.y - d.startY), 0, 1 - o.h),
      });
      return;
    }
    // Resize around the opposite (anchor) corner.
    const left = d.corner === "nw" || d.corner === "sw";
    const top = d.corner === "nw" || d.corner === "ne";
    const ax = left ? o.x + o.w : o.x;
    const ay = top ? o.y + o.h : o.y;
    const maxW = left ? ax : 1 - ax;
    const maxH = top ? ay : 1 - ay;
    let w = clamp(Math.abs(clamp(p.x, 0, 1) - ax), MIN_SIZE, maxW);
    let h = clamp(Math.abs(clamp(p.y, 0, 1) - ay), MIN_SIZE, maxH);
    if (aspect) {
      // In source-fraction units the box's w/h must equal aspect / sourceAspect.
      const rel = aspect / sourceAspect;
      h = w / rel;
      if (h > maxH) {
        h = maxH;
        w = h * rel;
      }
    }
    setCrop({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
  };

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    useEditor.getState().commitLive();
  };

  // Crop box in canvas percentages.
  const box = {
    left: ((stage.x + crop.x * stage.w) / W) * 100,
    top: ((stage.y + crop.y * stage.h) / H) * 100,
    width: ((crop.w * stage.w) / W) * 100,
    height: ((crop.h * stage.h) / H) * 100,
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        onPointerDown={(e) => onPointerDown(e)}
        className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
        style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
      >
        {/* Rule-of-thirds grid */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="border-[0.5px] border-white/30" />
          ))}
        </div>
        {CORNERS.map((corner) => (
          <div
            key={corner}
            aria-label={`Resize crop ${corner}`}
            onPointerDown={(e) => onPointerDown(e, corner)}
            className="absolute size-7 touch-none"
            style={{
              [corner.includes("n") ? "top" : "bottom"]: -10,
              [corner.includes("w") ? "left" : "right"]: -10,
              cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
            }}
          >
            <div
              className="absolute size-4 border-white"
              style={{
                [corner.includes("n") ? "top" : "bottom"]: 8,
                [corner.includes("w") ? "left" : "right"]: 8,
                borderTopWidth: corner.includes("n") ? 4 : 0,
                borderBottomWidth: corner.includes("s") ? 4 : 0,
                borderLeftWidth: corner.includes("w") ? 4 : 0,
                borderRightWidth: corner.includes("e") ? 4 : 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
