"use client";

import { ChevronUp } from "lucide-react";
import { useRef } from "react";
import { clipEnd, getTrack, projectDuration } from "@/engine/model/ops";
import { capturePointer } from "@/lib/pointer";
import { useEditor } from "@/store/editor";

/**
 * The collapsed timeline: a slim scrub bar showing where the clips are. Drag anywhere on it
 * to move the playhead; the chevron brings the full timeline back.
 */
export function MiniTimeline() {
  const project = useEditor((s) => s.project);
  const playhead = useEditor((s) => s.playhead);
  const bar = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const duration = projectDuration(project);
  const main = getTrack(project, "main");
  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);

  const scrubTo = (e: React.PointerEvent) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || duration === 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    useEditor.getState().setPlayhead(fraction * duration);
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-t border-white/[0.06] bg-[#0e0e11] px-3">
      <div
        ref={bar}
        role="slider"
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={playhead}
        tabIndex={0}
        className="relative h-7 flex-1 cursor-pointer touch-none"
        onPointerDown={(e) => {
          useEditor.getState().pause();
          scrubbing.current = true;
          capturePointer(bar.current, e.pointerId);
          scrubTo(e);
        }}
        onPointerMove={(e) => scrubbing.current && scrubTo(e)}
        onPointerUp={() => (scrubbing.current = false)}
        onPointerCancel={() => (scrubbing.current = false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
          {main?.clips.map((clip) => (
            <div
              key={clip.id}
              className="absolute inset-y-0 border-x border-neutral-900 bg-[#3a4757]"
              style={{ left: `${pct(clip.start)}%`, width: `${pct(clipEnd(clip) - clip.start)}%` }}
            />
          ))}
          <div className="absolute inset-y-0 left-0 bg-gold/40" style={{ width: `${pct(playhead)}%` }} />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]"
          style={{ left: `${pct(playhead)}%` }}
        />
      </div>
      <button
        type="button"
        aria-label="Show timeline"
        onClick={() => useEditor.getState().setTimelineCollapsed(false)}
        className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-neutral-200 hover:bg-white/15"
      >
        <ChevronUp className="size-5" />
      </button>
    </div>
  );
}
