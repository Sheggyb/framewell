"use client";

import { VolumeX, Volume2 } from "lucide-react";
import { findClip } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { secondsToUs, usToSeconds } from "@/engine/model/time";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

/** Volume and fades for a video or audio clip. */
export function MediaPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const asset = useEditor((s) => s.project.assets[clip.assetId]);
  if (panel !== "audio") return null;

  const set = (label: string, recipe: (c: MediaClip) => void, commit: "now" | "later" = "later") =>
    updateProject(
      label,
      (d) => {
        const c = findClip(d, clip.id)?.clip;
        if (c?.type === "media") recipe(c);
      },
      commit,
    );
  const maxFade = Math.min(5, usToSeconds(clip.duration) / 2);

  if (!asset?.hasAudio) {
    return (
      <PanelShell title="Audio">
        <p className="text-sm text-neutral-400">This clip has no sound.</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Audio">
      <div className="flex flex-col gap-4">
        <Section title="Volume">
          <Slider
            label="Volume"
            value={clip.volume}
            min={0}
            max={2}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set("Volume", (c) => void (c.volume = v))}
          />
          <div className="flex gap-2">
            <Chip active={clip.volume === 0} onClick={() => set("Mute clip", (c) => void (c.volume = 0), "now")}>
              <VolumeX /> Mute
            </Chip>
            <Chip active={clip.volume === 1} onClick={() => set("Reset volume", (c) => void (c.volume = 1), "now")}>
              <Volume2 /> 100%
            </Chip>
          </div>
        </Section>
        <Section title="Fades">
          <Slider
            label="Fade in"
            value={usToSeconds(clip.fadeIn)}
            min={0}
            max={maxFade}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => set("Fade in", (c) => void (c.fadeIn = secondsToUs(v)))}
          />
          <Slider
            label="Fade out"
            value={usToSeconds(clip.fadeOut)}
            min={0}
            max={maxFade}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => set("Fade out", (c) => void (c.fadeOut = secondsToUs(v)))}
          />
        </Section>
      </div>
    </PanelShell>
  );
}
