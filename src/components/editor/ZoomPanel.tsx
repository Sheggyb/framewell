"use client";

import { AudioWaveform, Eraser, Play, Plus, X } from "lucide-react";
import { useState } from "react";
import { addPunch, clearZoom, clipEnd, findClip, punchOnBeats, removePunch, visiblePunches } from "@/engine/model/ops";
import type { MediaClip } from "@/engine/model/project";
import { secondsToUs, usToSeconds, type Micros } from "@/engine/model/time";
import {
  DEFAULT_PUNCH_HOLD,
  DEFAULT_PUNCH_SCALE,
  PUNCH_STYLES,
  punchSpan,
  punchStart,
  ZOOM_MOTIONS,
  type Punch,
  type PunchStyle,
} from "@/engine/model/zoom";
import { cn } from "@/lib/utils";
import { updateProject } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell, Section, Slider } from "./controls";

type PunchSettings = Pick<Punch, "scale" | "hold" | "x" | "y" | "style">;

const FOCUS_POINTS = [0.2, 0.5, 0.8];
const PREVIEW_PAD: Micros = secondsToUs(0.35);

/** 3×3 grid for choosing where a punch-in zooms to. */
function FocusPicker({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
  return (
    <div className="grid w-24 shrink-0 grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/40 p-1" role="group" aria-label="Zoom towards">
      {FOCUS_POINTS.map((fy) =>
        FOCUS_POINTS.map((fx) => {
          const active = Math.abs(fx - x) < 0.1 && Math.abs(fy - y) < 0.1;
          return (
            <button
              key={`${fx}-${fy}`}
              type="button"
              aria-label={`Zoom towards ${fy < 0.4 ? "top" : fy > 0.6 ? "bottom" : "middle"} ${fx < 0.4 ? "left" : fx > 0.6 ? "right" : "centre"}`}
              aria-pressed={active}
              onClick={() => onChange(fx, fy)}
              className={cn("flex aspect-square items-center justify-center rounded", active ? "bg-gold/25" : "hover:bg-white/10")}
            >
              <span className={cn("size-1.5 rounded-full", active ? "bg-gold" : "bg-neutral-500")} />
            </button>
          );
        }),
      )}
    </div>
  );
}

/** Zoom: punch-ins at moments you choose, plus a slow camera move across the whole clip. */
export function ZoomPanel({ clip }: { clip: MediaClip }) {
  const panel = useEditor((s) => s.panel);
  const playhead = useEditor((s) => s.playhead);
  const markers = useEditor((s) => s.project.markers);
  const [defaults, setDefaults] = useState<PunchSettings>({
    scale: DEFAULT_PUNCH_SCALE,
    hold: DEFAULT_PUNCH_HOLD,
    x: 0.5,
    y: 0.5,
    style: "smooth",
  });
  if (panel !== "zoom") return null;

  const punches = visiblePunches(clip);
  const active = punches.find((p) => {
    const [start, end] = punchSpan(clip, p);
    return playhead >= start && playhead < end;
  });
  const settings: PunchSettings = active ?? defaults;
  const inClip = playhead >= clip.start && playhead < clipEnd(clip);
  const beats = markers.filter((m) => m >= clip.start && m < clipEnd(clip)).length;

  const editClip = (label: string, recipe: (c: MediaClip) => void, commit: "now" | "later" = "now") =>
    updateProject(
      label,
      (d) => {
        const c = findClip(d, clip.id)?.clip;
        if (c?.type === "media") recipe(c);
      },
      commit,
    );

  /** Plays just around a punch, then comes back. */
  const preview = (punch: Punch) => {
    const s = useEditor.getState();
    const [start, end] = punchSpan(clip, punch);
    s.play(Math.max(clip.start, start - PREVIEW_PAD), Math.min(clipEnd(clip), end + PREVIEW_PAD), s.playhead);
  };

  const change = (patch: Partial<PunchSettings>, commit: "now" | "later" = "now") => {
    if (!active) {
      setDefaults((d) => ({ ...d, ...patch }));
      return;
    }
    editClip(
      "Edit punch-in",
      (c) => {
        const p = c.zoom.punches.find((q) => q.id === active.id);
        if (p) Object.assign(p, patch);
      },
      commit,
    );
  };

  const add = () => {
    let id: string | null = null;
    updateProject("Add punch-in", (d) => void (id = addPunch(d, clip.id, playhead, defaults)), "now");
    const added = id && (findClip(useEditor.getState().project, clip.id)?.clip as MediaClip | undefined)?.zoom.punches.find((p) => p.id === id);
    if (added) preview(added);
  };

  return (
    <PanelShell title="Zoom">
      <div className="flex flex-col gap-5">
        <Section title="Punch-in">
          {active ? (
            <div className="flex gap-2">
              <Chip onClick={() => preview(active)} className="flex-1">
                <Play /> Preview
              </Chip>
              <Chip onClick={() => updateProject("Remove punch-in", (d) => removePunch(d, clip.id, active.id), "now")}>
                <X /> Remove
              </Chip>
            </div>
          ) : (
            <button
              type="button"
              disabled={!inClip}
              onClick={add}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-neutral-950 disabled:opacity-40"
            >
              <Plus className="size-4" /> Add punch-in at the playhead
            </button>
          )}
          {!inClip && !active && <p className="text-xs text-neutral-500">Move the playhead over this clip first.</p>}
          <p className="text-[11px] text-neutral-500">{active ? "Editing the punch-in at the playhead." : "Settings for the next punch-in:"}</p>
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="grid grid-cols-3 gap-1.5">
                {PUNCH_STYLES.map((style) => (
                  <Chip key={style.id} active={settings.style === style.id} onClick={() => change({ style: style.id as PunchStyle })} className="px-1">
                    {style.label}
                  </Chip>
                ))}
              </div>
              <Slider
                label="Zoom"
                value={settings.scale}
                min={1.05}
                max={2.5}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => change({ scale: v }, "later")}
              />
              <Slider
                label="Hold"
                value={usToSeconds(settings.hold)}
                min={0.1}
                max={4}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                onChange={(v) => change({ hold: secondsToUs(v) }, "later")}
              />
            </div>
            <FocusPicker x={settings.x} y={settings.y} onChange={(x, y) => change({ x, y })} />
          </div>
          {beats > 0 && (
            <Chip
              onClick={() => {
                let n = 0;
                updateProject("Punch on beats", (d) => void (n = punchOnBeats(d, clip.id, defaults.style, defaults.scale)), "now");
                useEditor.getState().showToast(`Added ${n} punch-in${n === 1 ? "" : "s"} on the beat`);
              }}
            >
              <AudioWaveform /> Punch on every beat ({beats})
            </Chip>
          )}
          {punches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {punches.map((p) => (
                <span key={p.id} className={cn("flex items-center rounded-full border text-xs", p.id === active?.id ? "border-gold/60 bg-gold/10" : "border-white/10 bg-white/[0.04]")}>
                  <button type="button" onClick={() => useEditor.getState().setPlayhead(punchStart(clip, p))} className="py-1 pr-1 pl-2.5 font-mono text-neutral-200">
                    {usToSeconds(punchStart(clip, p)).toFixed(1)}s
                  </button>
                  <button
                    type="button"
                    aria-label="Remove punch-in"
                    onClick={() => updateProject("Remove punch-in", (d) => removePunch(d, clip.id, p.id), "now")}
                    className="flex size-6 items-center justify-center rounded-full text-neutral-400 hover:text-red-400"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Camera move (whole clip)">
          <div className="grid grid-cols-4 gap-1.5">
            {ZOOM_MOTIONS.map((m) => (
              <Chip key={m.id} active={clip.zoom.motion === m.id} onClick={() => editClip(`Camera: ${m.label}`, (c) => void (c.zoom.motion = m.id))} className="px-1">
                {m.label}
              </Chip>
            ))}
          </div>
          {clip.zoom.motion !== "none" && (
            <Slider
              label="Amount"
              value={clip.zoom.strength}
              min={0.1}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => editClip("Camera amount", (c) => void (c.zoom.strength = v), "later")}
            />
          )}
        </Section>

        {(punches.length > 0 || clip.zoom.motion !== "none") && (
          <Chip onClick={() => updateProject("Clear zoom", (d) => clearZoom(d, clip.id), "now")}>
            <Eraser /> Remove all zoom from this clip
          </Chip>
        )}
      </div>
    </PanelShell>
  );
}
