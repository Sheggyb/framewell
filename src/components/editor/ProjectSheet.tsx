"use client";

import { Check, ChevronRight, CloudOff, Coffee, ExternalLink, History, House, Keyboard, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { projectDuration, setPlatform } from "@/engine/model/ops";
import { PLATFORM_ORDER, PLATFORMS } from "@/engine/model/platforms";
import { formatTimecode } from "@/engine/model/time";
import { saveProject } from "@/lib/storage";
import { SUPPORT_URL } from "@/lib/support";
import { updateProject } from "@/store/actions";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";
import { BackupAction } from "../backup/Backup";
import { Sheet } from "./Sheets";
import { setToolbarStyle, useToolbarStyle, type ToolbarStyle } from "./ToolDial";

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-neutral-200 hover:bg-white/[0.06] [&_svg]:size-4"
    >
      <span className="text-neutral-400">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="text-neutral-600" />
    </button>
  );
}

/** Everything about the project itself: name, video shape, backup, history. Opened from the name in the top bar. */
export function ProjectSheet({ savedAt, isDesktop }: { savedAt: number | null; isDesktop: boolean }) {
  const project = useEditor((s) => s.project);
  const toolbarStyle = useToolbarStyle();
  const { edit, openDialog } = useEditor.getState();
  const close = () => openDialog(null);
  const clipCount = project.tracks.reduce((n, t) => n + t.clips.length, 0);
  // Renames as you type (one undo step), so nothing is lost if the sheet closes mid-edit.
  const rename = (value: string, commit: "now" | "later") => updateProject("Rename", (d) => void (d.name = value), commit);

  return (
    <Sheet title="Project" icon={<SlidersHorizontal />} onClose={close}>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Name</span>
          <input
            defaultValue={project.name}
            key={project.id}
            enterKeyHint="done"
            onChange={(e) => rename(e.target.value, "later")}
            onBlur={(e) => !e.target.value.trim() && rename("Untitled video", "now")}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-base text-neutral-100 outline-none focus:border-gold/60"
          />
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            {savedAt ? <Check className="size-3.5 text-emerald-400" /> : <CloudOff className="size-3.5" />}
            {savedAt ? "Saved on this device" : "Saves automatically once you add something"}
            <span className="ml-auto font-mono">
              {formatTimecode(projectDuration(project), project.canvas.fps).slice(0, 5)} · {clipCount} clip{clipCount === 1 ? "" : "s"}
            </span>
          </span>
        </label>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Video shape</h3>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORM_ORDER.map((id) => {
              const p = PLATFORMS[id];
              const active = project.platform === id;
              const w = p.width > p.height ? 22 : (22 * p.width) / p.height;
              const h = p.height >= p.width ? 22 : (22 * p.height) / p.width;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => edit(`Platform: ${p.label}`, (d) => setPlatform(d, id))}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs transition-colors",
                    active ? "border-gold/70 bg-gold/10 text-white" : "border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]",
                  )}
                >
                  <span className="flex size-6 items-center justify-center">
                    <span className={cn("rounded-[3px] border-[1.5px]", active ? "border-gold" : "border-neutral-400")} style={{ width: w, height: h }} />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Backup</h3>
          <p className="text-xs leading-relaxed text-neutral-400">
            Your project lives only in this browser. Save a backup file (project + media) to keep it safe or to keep
            editing on another device.
          </p>
          <BackupAction
            projectId={project.id}
            disabled={clipCount === 0}
            beforeBackup={() => saveProject(useEditor.getState().project)}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Toolbar</h3>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
            {(
              [
                ["dial", "Dial"],
                ["classic", "Classic row"],
              ] as [ToolbarStyle, string][]
            ).map(([style, label]) => (
              <button
                key={style}
                type="button"
                aria-pressed={toolbarStyle === style}
                onClick={() => setToolbarStyle(style)}
                className={cn(
                  "h-9 rounded-lg text-sm transition-colors",
                  toolbarStyle === style ? "bg-gold/15 font-semibold text-gold" : "text-neutral-400 hover:text-neutral-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="-mx-2 flex flex-col">
          <Row icon={<History />} label="History of changes" onClick={() => openDialog("history")} />
          {isDesktop && <Row icon={<Keyboard />} label="Keyboard shortcuts" onClick={() => openDialog("shortcuts")} />}
          <Link
            href="/"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 hover:bg-white/[0.06] [&_svg]:size-4"
          >
            <House className="text-neutral-400" />
            <span className="flex-1">All projects</span>
            <ChevronRight className="text-neutral-600" />
          </Link>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 hover:bg-white/[0.06] [&_svg]:size-4"
          >
            <Coffee className="text-gold" />
            <span className="flex-1">Support Framewell</span>
            <ExternalLink className="text-neutral-600" />
          </a>
        </section>
      </div>
    </Sheet>
  );
}
