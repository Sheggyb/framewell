"use client";

import { Ban, CopyCheck, Droplets, FlipHorizontal, Maximize, Minimize, PaintBucket, RotateCcw, RotateCw } from "lucide-react";
import { centeredCrop, findClip, setBackdropForAll } from "@/engine/model/ops";
import { FULL_CROP, type Backdrop, type MediaClip } from "@/engine/model/project";
import { useT } from "@/i18n";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";
import { Swatches } from "./TextPanel";

/** Aspect ratios; `null` is "Free" (translated). */
const ASPECTS: [string, number | null][] = [
  ["free", null],
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
  const t = useT();
  if (panel !== "crop") return null;

  const sourceAspect = asset?.width && asset.height ? asset.width / asset.height : 1;
  const canvasAspect = useEditor.getState().project.canvas.width / useEditor.getState().project.canvas.height;

  return (
    <PanelShell title={t("media.crop.title")}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-neutral-400">{t("media.crop.hint")}</p>
        <div className="grid grid-cols-3 gap-2 @md:grid-cols-6">
          {ASPECTS.map(([id, ratio]) => (
            <Chip
              key={id}
              active={aspect === ratio}
              onClick={() => {
                useEditor.getState().setCropAspect(ratio);
                if (ratio) set(t("media.undo.crop", { ratio: id }), (c) => void (c.crop = centeredCrop(sourceAspect, ratio)));
              }}
            >
              {ratio ? id : t("media.crop.free")}
            </Chip>
          ))}
        </div>
        <Chip
          onClick={() => {
            useEditor.getState().setCropAspect(canvasAspect);
            set(t("media.undo.cropToFrame"), (c) => {
              c.crop = centeredCrop(sourceAspect, canvasAspect);
              c.frame.fit = "fill";
            });
          }}
        >
          <Maximize /> {t("media.crop.toFrame")}
        </Chip>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => set(t("media.undo.rotate"), (c) => void (c.frame.rotation = normalizeDegrees(c.frame.rotation + 90)))}>
            <RotateCw /> {t("media.crop.rotate90")}
          </Chip>
          <Chip active={clip.frame.flipH} onClick={() => set(t("media.undo.flip"), (c) => void (c.frame.flipH = !c.frame.flipH))}>
            <FlipHorizontal /> {t("media.crop.flip")}
          </Chip>
          <Chip
            onClick={() => {
              useEditor.getState().setCropAspect(null);
              set(t("media.undo.resetCrop"), (c) => {
                c.crop = { ...FULL_CROP };
                c.frame.rotation = 0;
                c.frame.flipH = false;
              });
            }}
          >
            <RotateCcw /> {t("media.crop.reset")}
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
  const t = useT();
  if (panel !== "frame") return null;
  const f = clip.frame;
  const b = clip.backdrop;
  const setBackdrop = (label: string, patch: Partial<Backdrop>, commit: "now" | "later" = "now") =>
    set(label, (c) => void (c.backdrop = { ...c.backdrop, ...patch }), commit);

  return (
    <PanelShell title={t("media.frame.title")}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Chip active={f.fit === "fit"} onClick={() => set(t("media.undo.fit"), (c) => void (c.frame.fit = "fit"))}>
            <Minimize /> {t("media.frame.fit")}
          </Chip>
          <Chip active={f.fit === "fill"} onClick={() => set(t("media.undo.fill"), (c) => void (c.frame.fit = "fill"))}>
            <Maximize /> {t("media.frame.fill")}
          </Chip>
        </div>
        {onMain && (
          <Section title={t("media.background.title")}>
            <div className="grid grid-cols-3 gap-2">
              <Chip active={b.type === "none"} onClick={() => setBackdrop(t("media.undo.backgroundBlack"), { type: "none" })}>
                <Ban /> {t("media.background.black")}
              </Chip>
              <Chip active={b.type === "blur"} onClick={() => setBackdrop(t("media.undo.backgroundBlur"), { type: "blur" })}>
                <Droplets /> {t("media.background.blur")}
              </Chip>
              <Chip active={b.type === "color"} onClick={() => setBackdrop(t("media.undo.backgroundColour"), { type: "color" })}>
                <PaintBucket /> {t("media.background.colour")}
              </Chip>
            </div>
            {b.type === "blur" && (
              <Slider
                label={t("media.background.blurAmount")}
                value={b.blur}
                min={0}
                max={1}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setBackdrop(t("media.undo.backgroundBlurAmount"), { blur: v }, "later")}
              />
            )}
            {b.type === "color" && <Swatches value={b.color} onChange={(color) => color && setBackdrop(t("media.undo.backgroundColourPick"), { color })} />}
            {b.type === "none" && f.fit === "fit" && (
              <p className="text-xs text-neutral-500">{t("media.background.tip")}</p>
            )}
            <Chip
              onClick={() => {
                updateProject(t("media.undo.backgroundForAll"), (d) => setBackdropForAll(d, clip.backdrop), "now");
                useEditor.getState().showToast(t("media.background.usedForAll"));
              }}
            >
              <CopyCheck /> {t("media.background.useForAll")}
            </Chip>
          </Section>
        )}
        <Section>
          <Slider
            label={t("media.frame.zoom")}
            value={f.scale}
            min={0.1}
            max={4}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set(t("media.undo.zoom"), (c) => void (c.frame.scale = v), "later")}
          />
          <Slider
            label={t("media.frame.rotate")}
            value={f.rotation}
            min={-180}
            max={180}
            format={(v) => `${Math.round(v)}°`}
            onChange={(v) => set(t("media.undo.rotate"), (c) => void (c.frame.rotation = v), "later")}
          />
        </Section>
        <p className="text-xs text-neutral-400">{t("media.frame.tip")}</p>
        <Chip
          onClick={() =>
            set(t("media.undo.resetFraming"), (c) => {
              Object.assign(c.frame, { x: 0.5, y: 0.5, scale: 1, rotation: 0 });
            })
          }
        >
          <RotateCcw /> {t("media.frame.reset")}
        </Chip>
      </div>
    </PanelShell>
  );
}
