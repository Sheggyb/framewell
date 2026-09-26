"use client";

import { Play } from "lucide-react";
import { findClip } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { secondsToUs, usToSeconds } from "@/engine/model/time";
import { TRANSITIONS, type TransitionType } from "@/engine/model/transition";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

const LABELS: Record<TransitionType, string> = {
  crossfade: "Crossfade",
  "dip-black": "Dip black",
  "dip-white": "Dip white",
  flash: "Flash",
  "slide-left": "Slide",
  "slide-up": "Slide up",
  "push-left": "Push",
  whip: "Whip",
  "zoom-in": "Zoom in",
  "zoom-out": "Zoom out",
  wipe: "Wipe",
  circle: "Circle",
  spin: "Spin",
};

const DEFAULT_DURATION = secondsToUs(0.5);

/** Plays across the cut so the user sees the transition, then returns to the cut. */
function previewTransition(clip: MediaClip) {
  const s = useEditor.getState();
  const half = (clip.transition?.duration ?? DEFAULT_DURATION) / 2;
  const lead = secondsToUs(0.4);
  s.play(Math.max(0, clip.start - half - lead), clip.start + half + lead, clip.start);
}

/** Transition into the selected main-track clip (i.e. at the cut before it). */
export function TransitionPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const project = useEditor((s) => s.project);
  if (panel !== "transition") return null;

  const found = findClip(project, clip.id);
  const isFirst = !found || found.track.kind !== "main" || found.index === 0;
  if (isFirst) {
    return (
      <PanelShell title="Transition">
        <p className="text-sm text-neutral-400">
          Transitions go between two clips. Select the clip <b>after</b> a cut on the main track, or tap the marker
          between clips on the timeline.
        </p>
      </PanelShell>
    );
  }

  const set = (label: string, transition: MediaClip["transition"], preview = true) => {
    useEditor.getState().edit(label, (d) => {
      const c = findClip(d, clip.id)?.clip;
      if (c?.type === "media") c.transition = transition;
    });
    const updated = findClip(useEditor.getState().project, clip.id)?.clip;
    if (preview && transition && updated?.type === "media") previewTransition(updated);
  };
  const current = clip.transition;
  const duration = current?.duration ?? DEFAULT_DURATION;

  return (
    <PanelShell title="Transition">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Chip active={!current} onClick={() => set("Remove transition", null, false)}>
            None
          </Chip>
          {TRANSITIONS.map((type) => (
            <Chip
              key={type}
              active={current?.type === type}
              onClick={() => set(`Transition: ${LABELS[type]}`, { type, duration })}
            >
              {LABELS[type]}
            </Chip>
          ))}
        </div>
        {current && (
          <Section>
            <Slider
              label="Duration"
              value={usToSeconds(current.duration)}
              min={0.2}
              max={2}
              step={0.1}
              format={(v) => `${v.toFixed(1)}s`}
              onChange={(v) =>
                updateProject("Transition duration", (d) => {
                  const c = findClip(d, clip.id)?.clip;
                  if (c?.type === "media" && c.transition) c.transition.duration = secondsToUs(v);
                })
              }
            />
            <Chip onClick={() => previewTransition(clip)}>
              <Play /> Preview
            </Chip>
          </Section>
        )}
      </div>
    </PanelShell>
  );
}
