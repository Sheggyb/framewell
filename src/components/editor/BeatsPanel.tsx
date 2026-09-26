"use client";

import { Pause, Play, Scissors, Trash, Undo2 } from "lucide-react";
import { removeMarkerNear } from "@/engine/model/ops";
import { secondsToUs } from "@/engine/model/time";
import { addBeatAtPlayhead, splitAtBeats } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell } from "./controls";

/**
 * Beat markers: play your music and tap along. Clips, text and trims snap to the markers,
 * and "Cut at beats" splits the video on every one.
 */
export function BeatsPanel() {
  const markers = useEditor((s) => s.project.markers);
  const playing = useEditor((s) => s.playing);
  const { togglePlay, edit, ask } = useEditor.getState();

  return (
    <PanelShell title="Beats">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
            className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white [&_svg]:size-6"
          >
            {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              addBeatAtPlayhead();
            }}
            className="flex h-16 flex-1 items-center justify-center rounded-xl bg-gold text-base font-bold text-neutral-950 active:bg-gold-soft"
          >
            Tap on the beat
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          {markers.length} beat{markers.length === 1 ? "" : "s"} marked. Play the music and tap along (press <b>M</b> on
          a keyboard). Clips and text snap to the gold markers on the timeline.
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={splitAtBeats} className={markers.length ? "" : "opacity-40"}>
            <Scissors /> Cut video at beats
          </Chip>
          <Chip
            onClick={() =>
              edit("Remove beat", (d) =>
                void removeMarkerNear(d, useEditor.getState().playhead, secondsToUs(0.5)),
              )
            }
            className={markers.length ? "" : "opacity-40"}
          >
            <Undo2 /> Remove nearest
          </Chip>
          <Chip
            onClick={() =>
              markers.length &&
              ask({
                title: `Clear all ${markers.length} beat markers?`,
                confirmLabel: "Clear",
                onConfirm: () => edit("Clear beats", (d) => void (d.markers = [])),
              })
            }
            className={markers.length ? "" : "opacity-40"}
          >
            <Trash /> Clear all
          </Chip>
        </div>
      </div>
    </PanelShell>
  );
}
