"use client";

import { VolumeX, Volume2 } from "lucide-react";
import { findClip } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { secondsToUs, usToSeconds } from "@/engine/model/time";
import { useLocale, useT } from "@/i18n";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

/** Volume and fades for a video or audio clip. */
export function MediaPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const asset = useEditor((s) => s.project.assets[clip.assetId]);
  const t = useT();
  const locale = useLocale();
  if (panel !== "audio") return null;
  const seconds = (v: number) => `${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`;

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
      <PanelShell title={t("media.audio.title")}>
        <p className="text-sm text-neutral-400">{t("media.audio.noSound")}</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={t("media.audio.title")}>
      <div className="flex flex-col gap-4">
        <Section title={t("media.audio.volume")}>
          <Slider
            label={t("media.audio.volume")}
            value={clip.volume}
            min={0}
            max={2}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set(t("media.undo.volume"), (c) => void (c.volume = v))}
          />
          <div className="flex gap-2">
            <Chip active={clip.volume === 0} onClick={() => set(t("media.undo.muteClip"), (c) => void (c.volume = 0), "now")}>
              <VolumeX /> {t("media.audio.mute")}
            </Chip>
            <Chip active={clip.volume === 1} onClick={() => set(t("media.undo.resetVolume"), (c) => void (c.volume = 1), "now")}>
              <Volume2 /> 100%
            </Chip>
          </div>
        </Section>
        <Section title={t("media.audio.fades")}>
          <Slider
            label={t("media.audio.fadeIn")}
            value={usToSeconds(clip.fadeIn)}
            min={0}
            max={maxFade}
            step={0.1}
            format={seconds}
            onChange={(v) => set(t("media.undo.fadeIn"), (c) => void (c.fadeIn = secondsToUs(v)))}
          />
          <Slider
            label={t("media.audio.fadeOut")}
            value={usToSeconds(clip.fadeOut)}
            min={0}
            max={maxFade}
            step={0.1}
            format={seconds}
            onChange={(v) => set(t("media.undo.fadeOut"), (c) => void (c.fadeOut = secondsToUs(v)))}
          />
        </Section>
      </div>
    </PanelShell>
  );
}
