"use client";

import { useEffect, useRef, useState } from "react";
import { importFile, prepareAudio } from "@/engine/media/registry";
import { createProject, type Project } from "@/engine/model/project";
import { loadMedia, loadProject, requestPersistence, saveProject } from "@/lib/storage";
import { useEditor } from "@/store/editor";

const SAVE_DELAY_MS = 800;
const THUMB_WIDTH = 180;

export type PersistenceStatus =
  | { state: "loading" }
  | { state: "ready"; savedAt: number | null; warning: string | null };

/** Small JPEG of the current preview frame for the project list. */
async function captureThumbnail(): Promise<Blob | null> {
  const preview = document.querySelector<HTMLCanvasElement>("canvas[data-preview]");
  if (!preview || preview.width === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = Math.round((THUMB_WIDTH * preview.height) / preview.width);
  canvas.getContext("2d")?.drawImage(preview, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
}

/** Re-registers a saved project's media. Returns the names of files that couldn't be restored. */
async function restoreMedia(project: Project): Promise<string[]> {
  const missing: string[] = [];
  for (const asset of Object.values(project.assets)) {
    try {
      const file = await loadMedia(asset.id);
      if (!file) throw new Error("not stored");
      await importFile(file, asset.id);
      if (asset.hasAudio) void prepareAudio(asset.id);
    } catch {
      missing.push(asset.name);
    }
  }
  return missing;
}

/**
 * Opens the project named in `?id=` (or starts a new one) and autosaves every change
 * to on-device storage.
 */
export function useProjectPersistence(): PersistenceStatus {
  const [status, setStatus] = useState<PersistenceStatus>({ state: "loading" });
  const ready = useRef(false);

  // Open.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      void requestPersistence();
      const id = new URLSearchParams(window.location.search).get("id");
      const saved = id ? await loadProject(id).catch(() => null) : null;
      if (cancelled) return;
      if (!saved) {
        // New project (or an id that was never saved, e.g. refreshed before the first edit).
        const project = createProject();
        if (id) project.id = id;
        useEditor.getState().openProject(project);
        window.history.replaceState(null, "", `?id=${project.id}`);
        ready.current = true;
        setStatus({ state: "ready", savedAt: null, warning: null });
        return;
      }
      const project = saved;
      const missing = await restoreMedia(project);
      if (cancelled) return;
      useEditor.getState().openProject(project);
      ready.current = true;
      setStatus({
        state: "ready",
        // It came from storage, so it is saved.
        savedAt: Date.now(),
        warning: missing.length ? `Couldn't restore: ${missing.join(", ")}. Re-import to fix.` : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave (debounced), plus an immediate save when the tab is hidden or closed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = async () => {
      clearTimeout(timer);
      if (!ready.current) return;
      const { project } = useEditor.getState();
      // Don't fill the project list with projects that were opened and left empty.
      const empty = Object.keys(project.assets).length === 0 && project.tracks.every((t) => t.clips.length === 0);
      if (empty) return;
      try {
        await saveProject(project, await captureThumbnail());
        setStatus((s) => (s.state === "ready" ? { ...s, savedAt: Date.now() } : s));
      } catch {
        setStatus((s) => (s.state === "ready" ? { ...s, warning: "Couldn't save this project on this device." } : s));
      }
    };
    const unsubscribe = useEditor.subscribe((state, prev) => {
      if (state.project === prev.project || !ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void save(), SAVE_DELAY_MS);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      // Flush pending changes when leaving the editor.
      if (timer) void save();
    };
  }, []);

  return status;
}
