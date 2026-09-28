"use client";

import { useEffect, useRef, useState } from "react";
import { importFile, prepareAudio, releaseAllAssets } from "@/engine/media/registry";
import { createProject, type Project } from "@/engine/model/project";
import { deleteProject, loadMedia, loadProject, requestPersistence, saveProject } from "@/lib/storage";
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
      const file = await loadMedia(asset.id, { projectId: project.id, name: asset.name, type: asset.mimeType });
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
  /** Opened from the project list (as opposed to started here). */
  const fromStorage = useRef(false);
  /** A copy of this project is in storage. */
  const stored = useRef(false);

  // Open.
  useEffect(() => {
    let cancelled = false;
    // Media of a project opened before this one: free it before loading this one's.
    releaseAllAssets();
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
      fromStorage.current = stored.current = true;
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
      // Leaving the editor: decoders, images and decoded sound can go.
      releaseAllAssets();
    };
  }, []);

  // Autosave (debounced), plus an immediate save when the tab is hidden or closed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    /** Media was imported into this project: its stored files must survive an undo (redo brings the clip back). */
    let hadMedia = false;
    /** Saves run one at a time, so a delete never races a save. */
    let queue: Promise<void> = Promise.resolve();
    const save = () => {
      clearTimeout(timer);
      queue = queue.then(saveNow, saveNow);
      return queue;
    };
    const saveNow = async () => {
      if (!ready.current) return;
      const { project } = useEditor.getState();
      if (Object.keys(project.assets).length > 0) hadMedia = true;
      // Don't fill the project list with projects that were started and left empty. One that was
      // saved and then emptied again (e.g. a cancelled text) comes off the list; one opened from
      // the list is saved as it is.
      const empty = Object.keys(project.assets).length === 0 && project.tracks.every((t) => t.clips.length === 0);
      if (empty && !fromStorage.current && !hadMedia) {
        if (stored.current) {
          stored.current = false;
          await deleteProject(project.id).catch(() => {});
          setStatus((s) => (s.state === "ready" ? { ...s, savedAt: null } : s));
        }
        return;
      }
      try {
        await saveProject(project, await captureThumbnail());
        stored.current = true;
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
