"use client";

import { Archive, ArrowRight, Film, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTimecode } from "@/engine/model/time";
import { deleteProject, listProjects, type ProjectSummary } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { BackupAction, OpenBackupButton } from "../backup/Backup";

function timeAgo(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ms).toLocaleDateString();
}

function Thumbnail({ blob }: { blob: Blob | null }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing to optimise
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <Film className="size-6 text-neutral-600" />
  );
}

/** Fired on window when a project is deleted, so every list on the page reloads. */
const CHANGED = "framewell:projects-changed";

/** Projects saved on this device, newest first; null while loading. */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  useEffect(() => {
    const load = () =>
      listProjects()
        .then(setProjects)
        .catch(() => setProjects([]));
    void load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, []);
  return projects;
}

function useOpenRestored() {
  const router = useRouter();
  return (id: string) => router.push(`/editor?id=${id}`);
}

/** For first-time visitors (no projects yet): restore a backup made on another device. */
export function RestoreBackupHint() {
  const projects = useProjects();
  const openRestored = useOpenRestored();
  if (!projects || projects.length > 0) return null;
  return (
    <div className="mt-16 flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-500">
      Have a backup from another device?
      <OpenBackupButton onRestored={openRestored} />
    </div>
  );
}

/**
 * Projects saved on this device, newest first, with backup, restore and delete. Shows nothing
 * until there is a project, so returning creators find their work first thing.
 */
export function ProjectList({ className, title = "Continue editing" }: { className?: string; title?: string }) {
  const projects = useProjects();
  const openRestored = useOpenRestored();
  const [backingUp, setBackingUp] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!projects || projects.length === 0) return null;

  const remove = async (p: ProjectSummary) => {
    setDeleting(null);
    try {
      await deleteProject(p.id);
    } catch {
      window.alert(`Couldn't delete "${p.name}". Please try again.`);
    }
    window.dispatchEvent(new Event(CHANGED));
  };

  return (
    <section className={cn("w-full max-w-md text-left", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-neutral-400">{title}</h2>
        <OpenBackupButton onRestored={openRestored} className="px-3 py-1.5 text-xs" />
      </div>
      <ul className="flex flex-col gap-2">
        {projects.map((p) => (
          <li key={p.id} className="rounded-xl bg-white/5 p-2 pr-3">
            <div className="flex items-center gap-3">
              <Link href={`/editor?id=${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-16 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black">
                  <Thumbnail blob={p.thumbnail} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-100">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    {formatTimecode(p.duration, 30).slice(0, 5)} · {timeAgo(p.updatedAt)}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Back up ${p.name}`}
                title="Back up to a file"
                aria-expanded={backingUp === p.id}
                onClick={() => {
                  setBackingUp(backingUp === p.id ? null : p.id);
                  setDeleting(null);
                }}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-gold",
                  backingUp === p.id && "bg-gold/15 text-gold",
                )}
              >
                <Archive className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${p.name}`}
                aria-expanded={deleting === p.id}
                onClick={() => {
                  setDeleting(deleting === p.id ? null : p.id);
                  setBackingUp(null);
                }}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-red-400",
                  deleting === p.id && "bg-red-500/15 text-red-400",
                )}
              >
                <Trash className="size-4" />
              </button>
            </div>
            {deleting === p.id && (
              <div role="alert" className="mt-2 flex items-center gap-2 pl-1">
                <p className="min-w-0 flex-1 text-xs text-neutral-400">
                  Delete this project and its media on this device? This can&apos;t be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="h-9 rounded-lg bg-white/10 px-3 text-sm text-neutral-200"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  className="h-9 rounded-lg bg-red-500 px-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            )}
            {backingUp === p.id && (
              <div className="mt-2 pl-1">
                <BackupAction projectId={p.id} />
                <p className="mt-1.5 text-center text-[11px] text-neutral-500">
                  One file with the project and its media. Open it on any device with “Open a backup”.
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The "My videos" tab: every saved project, or a friendly start when there are none yet. */
export function MyVideos() {
  const projects = useProjects();
  const openRestored = useOpenRestored();
  if (!projects) return <div className="h-40" aria-busy="true" />;
  if (projects.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
        <Film className="size-8 text-gold" />
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">No videos yet</h2>
          <p className="mt-1 text-sm text-neutral-400">Everything you make is saved here, on this device, automatically.</p>
        </div>
        <Link
          href="/editor"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-neutral-950"
        >
          <Plus className="size-4" /> Start a new video
        </Link>
        <div className="flex flex-col items-center gap-1 text-xs text-neutral-500">
          Made a backup on another device?
          <OpenBackupButton onRestored={openRestored} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <ProjectList title={`${projects.length} saved on this device`} />
      <p className="max-w-md text-center text-xs text-neutral-500">
        Videos live in this browser only. Tap <Archive className="inline size-3.5 align-[-2px]" /> to save a backup file you
        can keep or open on another device.
      </p>
    </div>
  );
}

/** "Pick up where you left off": the most recent project, for the Home tab. */
export function LatestProject() {
  const projects = useProjects();
  const latest = projects?.[0];
  if (!latest) return null;
  return (
    <Link
      href={`/editor?id=${latest.id}`}
      className="group flex w-full max-w-sm items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.05] p-2 pr-4 text-left transition-colors hover:bg-gold/10"
    >
      <div className="flex h-14 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black">
        <Thumbnail blob={latest.thumbnail} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gold">Continue editing</p>
        <p className="truncate text-sm font-medium text-neutral-100">{latest.name}</p>
      </div>
      <ArrowRight className="size-4 text-gold transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
