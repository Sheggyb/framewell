"use client";

import { Ban, CopyCheck, Droplets, FlipHorizontal, Maximize, Minimize, PaintBucket, RotateCcw, RotateCw } from "lucide-react";
import { centeredCrop, findClip, setBackdropForAll } from "@/engine/model/ops";
import { FULL_CROP, type Backdrop, type MediaClip } from "@/engine/model/project";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";
import { Swatches } from "./TextPanel";

const ASPECTS: [string, number | null][] = [
  ["Free", null],
  ["9:16", 9 / 16],
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["3:4", 3 / 4],
  ["16:9", 16 / 9],
];

/** Wraps an angle into [-180, 180). */
const normalizeDegrees = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

function useClipEditor(clip: MediaClip) {
  return (label: string, recipe: (c: MediaClip) => void, commit: "now" | "later" = "now") =>
    updateProject(
      label,
      (d) => {
        const c = findClip(d, clip.id)?.clip;
        if (c?.type === "media") recipe(c);
      },
      commit,
    );
}

/** Crop: pick an aspect ratio and drag the box on the preview; plus rotate, flip and reset. */
export function CropPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const aspect = useEditor((s) => s.cropAspect);
  const asset = useEditor((s) => s.project.assets[clip.assetId]);
  const set = useClipEditor(clip);
  if (panel !== "crop") return null;

  const sourceAspect = asset?.width && asset.height ? asset.width / asset.height : 1;
  const canvasAspect = useEditor.getState().project.canvas.width / useEditor.getState().project.canvas.height;

  return (
    <PanelShell title="Crop">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-neutral-400">Drag the box to choose what shows. Drag a corner to resize.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ASPECTS.map(([label, ratio]) => (
            <Chip
              key={label}
              active={aspect === ratio}
              onClick={() => {
                useEditor.getState().setCropAspect(ratio);
                if (ratio) set(`Crop ${label}`, (c) => void (c.crop = centeredCrop(sourceAspect, ratio)));
              }}
            >
              {label}
            </Chip>
          ))}
        </div>
        <Chip
          onClick={() => {
            useEditor.getState().setCropAspect(canvasAspect);
            set("Crop to frame", (c) => {
              c.crop = centeredCrop(sourceAspect, canvasAspect);
              c.frame.fit = "fill";
            });
          }}
        >
          <Maximize /> Crop to fill the video
        </Chip>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => set("Rotate", (c) => void (c.frame.rotation = normalizeDegrees(c.frame.rotation + 90)))}>
            <RotateCw /> Rotate 90°
          </Chip>
          <Chip active={clip.frame.flipH} onClick={() => set("Flip", (c) => void (c.frame.flipH = !c.frame.flipH))}>
            <FlipHorizontal /> Flip
          </Chip>
          <Chip
            onClick={() => {
              useEditor.getState().setCropAspect(null);
              set("Reset crop", (c) => {
                c.crop = { ...FULL_CROP };
                c.frame.rotation = 0;
                c.frame.flipH = false;
              });
            }}
          >
            <RotateCcw /> Reset
          </Chip>
        </div>
      </div>
    </PanelShell>
  );
}

/** Framing: fit or fill, zoom, rotation and position of the picture in the video. */
export function FramePanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const onMain = useEditor((s) => findClip(s.project, clip.id)?.track.kind === "main");
  const set = useClipEditor(clip);
  if (panel !== "frame") return null;
  const f = clip.frame;
  const b = clip.backdrop;
  const setBackdrop = (label: string, patch: Partial<Backdrop>, commit: "now" | "later" = "now") =>
    set(label, (c) => void (c.backdrop = { ...c.backdrop, ...patch }), commit);

  return (
    <PanelShell title="Frame">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Chip active={f.fit === "fit"} onClick={() => set("Fit", (c) => void (c.frame.fit = "fit"))}>
            <Minimize /> Fit
          </Chip>
          <Chip active={f.fit === "fill"} onClick={() => set("Fill", (c) => void (c.frame.fit = "fill"))}>
            <Maximize /> Fill
          </Chip>
        </div>
        {onMain && (
          <Section title="Background">
            <div className="grid grid-cols-3 gap-2">
              <Chip active={b.type === "none"} onClick={() => setBackdrop("Background: black", { type: "none" })}>
                <Ban /> Black
              </Chip>
              <Chip active={b.type === "blur"} onClick={() => setBackdrop("Background: blur", { type: "blur" })}>
                <Droplets /> Blur
              </Chip>
              <Chip active={b.type === "color"} onClick={() => setBackdrop("Background: colour", { type: "color" })}>
                <PaintBucket /> Colour
              </Chip>
            </div>
            {b.type === "blur" && (
              <Slider
                label="Blur"
                value={b.blur}
                min={0}
                max={1}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setBackdrop("Background blur", { blur: v }, "later")}
              />
            )}
            {b.type === "color" && <Swatches value={b.color} onChange={(color) => color && setBackdrop("Background colour", { color })} />}
            {b.type === "none" && f.fit === "fit" && (
              <p className="text-xs text-neutral-500">Tip: Blur fills the black bars with a soft copy of the picture.</p>
            )}
            <Chip
              onClick={() => {
                updateProject("Background for all clips", (d) => setBackdropForAll(d, clip.backdrop), "now");
                useEditor.getState().showToast("Background used for every clip");
              }}
            >
              <CopyCheck /> Use for all clips
            </Chip>
          </Section>
        )}
        <Section>
          <Slider
            label="Zoom"
            value={f.scale}
            min={0.1}
            max={4}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set("Zoom", (c) => void (c.frame.scale = v), "later")}
          />
          <Slider
            label="Rotate"
            value={f.rotation}
            min={-180}
            max={180}
            format={(v) => `${Math.round(v)}°`}
            onChange={(v) => set("Rotate", (c) => void (c.frame.rotation = v), "later")}
          />
        </Section>
        <p className="text-xs text-neutral-400">Tip: drag the picture on the preview to move it, or use the ↻ corner to zoom and rotate.</p>
        <Chip
          onClick={() =>
            set("Reset framing", (c) => {
              Object.assign(c.frame, { x: 0.5, y: 0.5, scale: 1, rotation: 0 });
            })
          }
        >
          <RotateCcw /> Center & reset
        </Chip>
      </div>
    </PanelShell>
  );
}
