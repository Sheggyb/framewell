"use client";

import { Snowflake } from "lucide-react";
import { findClip, setClipSpeed } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { usToSeconds } from "@/engine/model/time";
import { freezeFrameAtPlayhead, updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

const PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Speed (slow motion / fast forward) and freeze frame for a video or photo clip. */
export function SpeedPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const project = useEditor((s) => s.project);
  if (panel !== "speed") return null;

  const asset = project.assets[clip.assetId];
  const onMain = findClip(project, clip.id)?.track.kind === "main";
  const set = (speed: number, commit: "now" | "later") =>
    updateProject(`Speed ${speed.toFixed(2)}×`, (d) => setClipSpeed(d, clip.id, speed), commit);

  return (
    <PanelShell title="Speed">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((speed) => (
            <Chip key={speed} active={Math.abs(clip.speed - speed) < 0.001} onClick={() => set(speed, "now")}>
              {speed}×
            </Chip>
          ))}
        </div>
        <Section>
          <Slider
            label="Custom"
            value={clip.speed}
            min={0.1}
            max={4}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set(v, "later")}
          />
          <p className="text-xs text-neutral-400">
            Clip length: <span className="font-mono text-neutral-200">{usToSeconds(clip.duration).toFixed(1)}s</span>
            {asset?.hasAudio && clip.speed !== 1 && " · the sound's pitch changes too (mute it under Audio if you prefer)"}
          </p>
        </Section>
        {onMain && asset?.kind === "video" && (
          <Chip onClick={() => void freezeFrameAtPlayhead()}>
            <Snowflake /> Freeze frame at the playhead
          </Chip>
        )}
      </div>
    </PanelShell>
  );
}
