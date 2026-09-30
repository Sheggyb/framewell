"use client";

import { Pause, Play, Scissors, Trash, Undo2 } from "lucide-react";
import { removeMarkerNear } from "@/engine/model/ops";
import { secondsToUs } from "@/engine/model/time";
import { Rich } from "@/components/i18n/Rich";
import { useT } from "@/i18n";
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
  const t = useT();

  return (
    <PanelShell title={t("media.beats.title")}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={playing ? t("media.beats.pause") : t("media.beats.play")}
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
            {t("media.beats.tap")}
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          <Rich text={t("media.beats.hint", { count: markers.length })} tags={{ b: (s) => <b>{s}</b> }} />
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip onClick={splitAtBeats} className={markers.length ? "" : "opacity-40"}>
            <Scissors /> {t("media.beats.cut")}
          </Chip>
          <Chip
            onClick={() =>
              edit(t("media.undo.removeBeat"), (d) =>
                void removeMarkerNear(d, useEditor.getState().playhead, secondsToUs(0.5)),
              )
            }
            className={markers.length ? "" : "opacity-40"}
          >
            <Undo2 /> {t("media.beats.removeNearest")}
          </Chip>
          <Chip
            onClick={() =>
              markers.length &&
              ask({
                title: t("media.beats.clearAsk", { count: markers.length }),
                confirmLabel: t("media.beats.clear"),
                onConfirm: () => edit(t("media.undo.clearBeats"), (d) => void (d.markers = [])),
              })
            }
            className={markers.length ? "" : "opacity-40"}
          >
            <Trash /> {t("media.beats.clearAll")}
          </Chip>
        </div>
      </div>
    </PanelShell>
  );
}
