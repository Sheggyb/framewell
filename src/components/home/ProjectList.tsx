"use client";

import { Archive, Film, Trash } from "lucide-react";
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

/** Projects saved on this device (IndexedDB), newest first, plus backup and restore. */
export function ProjectList() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [backingUp, setBackingUp] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  if (!projects) return null;
  const openRestored = (id: string) => router.push(`/editor?id=${id}`);

  if (projects.length === 0) {
    return (
      <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-500">
        Have a backup from another device?
        <OpenBackupButton onRestored={openRestored} />
      </p>
    );
  }

  const remove = async (p: ProjectSummary) => {
    if (!window.confirm(`Delete "${p.name}"? Its media copies on this device are removed too.`)) return;
    await deleteProject(p.id);
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
  };

  return (
    <section className="w-full max-w-md text-left">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-neutral-400">Continue editing</h2>
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
                onClick={() => setBackingUp(backingUp === p.id ? null : p.id)}
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
                onClick={() => void remove(p)}
                className="flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-red-400"
              >
                <Trash className="size-4" />
              </button>
            </div>
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
