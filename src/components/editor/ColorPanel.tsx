"use client";

import { Ban, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FILTERS, NEUTRAL_ADJUST, type ColorAdjust } from "@/engine/model/color";
import { findClip } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { useLabel, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider, Tabs } from "./controls";

/** Adjustment sliders: key, English name (other languages: the "adjust" labels), minimum. */
const SLIDERS: [keyof ColorAdjust, string, number][] = [
  ["exposure", "Brightness", -1],
  ["contrast", "Contrast", -1],
  ["saturation", "Saturation", -1],
  ["warmth", "Warmth", -1],
  ["tint", "Tint", -1],
  ["fade", "Fade", 0],
  ["vignette", "Vignette", 0],
  ["grain", "Grain", 0],
];

const percent = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;

/** Filters (one-tap looks) and manual colour adjustments for a video or photo clip. */
export function ColorPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const [tab, setTab] = useState<"filters" | "adjust">("filters");
  const t = useT();
  const L = useLabel();
  if (panel !== "color") return null;

  const color = clip.color;
  const set = (label: string, recipe: (c: MediaClip) => void, commit: "now" | "later" = "now") =>
    updateProject(
      label,
      (d) => {
        const c = findClip(d, clip.id)?.clip;
        if (c?.type === "media") recipe(c);
      },
      commit,
    );

  const applyToAll = () => {
    useEditor.getState().edit(t("media.undo.colourForAll"), (d) => {
      for (const track of d.tracks) {
        for (const c of track.clips) {
          if (c.type !== "media" || d.assets[c.assetId]?.kind === "audio") continue;
          c.color = JSON.parse(JSON.stringify(color));
        }
      }
    });
    useEditor.getState().showToast(t("media.color.appliedToAll"));
  };

  return (
    <PanelShell title={t("media.color.title")}>
      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ["filters", t("media.color.filters")],
            ["adjust", t("media.color.adjust")],
          ]}
        />

        {tab === "filters" && (
          <>
            <div className="grid grid-cols-4 gap-2 @md:grid-cols-7">
              <FilterButton label={t("media.color.none")} active={!color.filter} onClick={() => set(t("media.undo.noFilter"), (c) => void (c.color.filter = null))}>
                <Ban className="size-5 text-neutral-400" />
              </FilterButton>
              {FILTERS.map((f) => (
                <FilterButton
                  key={f.id}
                  label={L("filter", f.id, f.label)}
                  active={color.filter === f.id}
                  onClick={() =>
                    set(t("media.undo.filter", { name: L("filter", f.id, f.label) }), (c) => {
                      c.color.filter = f.id;
                      c.color.intensity = 1;
                    })
                  }
                  swatch={f.swatch}
                />
              ))}
            </div>
            {color.filter && (
              <Slider
                label={t("media.color.strength")}
                value={color.intensity}
                min={0}
                max={1}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set(t("media.undo.filterStrength"), (c) => void (c.color.intensity = v), "later")}
              />
            )}
          </>
        )}

        {tab === "adjust" && (
          <Section>
            {SLIDERS.map(([key, label, min]) => (
              <Slider
                key={key}
                label={L("adjust", key, label)}
                value={color.adjust[key]}
                min={min}
                max={1}
                step={0.01}
                format={percent}
                onChange={(v) => set(L("adjust", key, label), (c) => void (c.color.adjust[key] = v), "later")}
              />
            ))}
          </Section>
        )}

        <div className="flex flex-wrap gap-2">
          <Chip onClick={applyToAll}>
            <Copy /> {t("media.color.applyToAll")}
          </Chip>
          <Chip
            onClick={() =>
              set(t("media.undo.resetColour"), (c) => {
                c.color = { filter: null, intensity: 1, adjust: { ...NEUTRAL_ADJUST } };
              })
            }
          >
            <RotateCcw /> {t("media.color.reset")}
          </Chip>
        </div>
      </div>
    </PanelShell>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  swatch,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  swatch?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-xl border-2 transition-colors",
          active ? "border-gold" : "border-transparent",
        )}
        style={swatch ? { background: `linear-gradient(145deg, ${swatch}, #121214 85%)` } : { background: "#1a1a1e" }}
      >
        {children}
      </span>
      <span className={cn("text-[11px]", active ? "text-gold" : "text-neutral-400")}>{label}</span>
    </button>
  );
}
