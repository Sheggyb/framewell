"use client";

import { Snowflake } from "lucide-react";
import { findClip, setClipSpeed } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { usToSeconds } from "@/engine/model/time";
import { Rich } from "@/components/i18n/Rich";
import { useLocale, useT } from "@/i18n";
import { freezeFrameAtPlayhead, updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

const PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Speed (slow motion / fast forward) and freeze frame for a video or photo clip. */
export function SpeedPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const project = useEditor((s) => s.project);
  const t = useT();
  const locale = useLocale();
  if (panel !== "speed") return null;
  const num = (v: number, digits: number) => v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const asset = project.assets[clip.assetId];
  const onMain = findClip(project, clip.id)?.track.kind === "main";
  const set = (speed: number, commit: "now" | "later") =>
    updateProject(t("media.undo.speed", { value: num(speed, 2) }), (d) => setClipSpeed(d, clip.id, speed), commit);

  return (
    <PanelShell title={t("media.speed.title")}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((speed) => (
            <Chip key={speed} active={Math.abs(clip.speed - speed) < 0.001} onClick={() => set(speed, "now")}>
              {speed.toLocaleString(locale)}×
            </Chip>
          ))}
        </div>
        <Section>
          <Slider
            label={t("media.speed.custom")}
            value={clip.speed}
            min={0.1}
            max={4}
            step={0.05}
            format={(v) => `${num(v, 2)}×`}
            onChange={(v) => set(v, "later")}
          />
          <p className="text-xs text-neutral-400">
            <Rich
              text={t("media.speed.length", { seconds: num(usToSeconds(clip.duration), 1) })}
              tags={{ v: (s) => <span className="font-mono text-neutral-200">{s}</span> }}
            />
            {asset?.hasAudio && clip.speed !== 1 && ` · ${t("media.speed.pitch")}`}
          </p>
        </Section>
        {onMain && asset?.kind === "video" && (
          <Chip onClick={() => void freezeFrameAtPlayhead()}>
            <Snowflake /> {t("media.speed.freeze")}
          </Chip>
        )}
      </div>
    </PanelShell>
  );
}
