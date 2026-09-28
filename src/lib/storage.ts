/**
 * On-device persistence: projects (JSON), thumbnails and saved styles in IndexedDB; media bytes
 * in OPFS (src/lib/opfs.ts), with IndexedDB as the fallback where OPFS can't be written.
 * Nothing leaves the device. Browser-only.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { migrateProject } from "@/engine/model/migrate";
import { projectDuration } from "@/engine/model/ops";
import type { Id, Project } from "@/engine/model/project";
import type { TextAnimation, TextStyle } from "@/engine/model/text";
import { deleteProjectFiles, readMediaFile, writeMediaFile } from "./opfs";

interface StoredProject {
  id: Id;
  project: Project;
  updatedAt: number;
  thumbnail: Blob | null;
}

interface StoredMedia {
  assetId: Id;
  projectId: Id;
  /** The bytes when kept in IndexedDB (saved before OPFS, or OPFS unavailable); null when in OPFS. */
  file: Blob | null;
  name: string;
  type: string;
}

/** A text look the user saved to reuse ("My styles"). */
export interface SavedStyle {
  id: Id;
  name: string;
  style: TextStyle;
  animation: TextAnimation;
  createdAt: number;
}

interface FramewellDB extends DBSchema {
  projects: { key: Id; value: StoredProject; indexes: { updatedAt: number } };
  media: { key: Id; value: StoredMedia; indexes: { projectId: Id } };
  styles: { key: Id; value: SavedStyle };
}

export interface ProjectSummary {
  id: Id;
  name: string;
  updatedAt: number;
  duration: number;
  thumbnail: Blob | null;
}

let db: Promise<IDBPDatabase<FramewellDB>> | null = null;

function database() {
  db ??= openDB<FramewellDB>("framewell", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore("projects", { keyPath: "id" }).createIndex("updatedAt", "updatedAt");
        d.createObjectStore("media", { keyPath: "assetId" }).createIndex("projectId", "projectId");
      }
      if (oldVersion < 2) d.createObjectStore("styles", { keyPath: "id" });
    },
  });
  return db;
}

/** Asks the browser not to evict our data under storage pressure (best effort). */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported; data is still stored, just evictable.
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await (await database()).getAllFromIndex("projects", "updatedAt");
  return all.reverse().map(({ id, project, updatedAt, thumbnail }) => ({
    id,
    name: project.name,
    updatedAt,
    duration: projectDuration(project),
    thumbnail,
  }));
}

export async function loadProject(id: Id): Promise<Project | null> {
  const stored = (await (await database()).get("projects", id))?.project;
  return stored ? migrateProject(stored) : null;
}

export async function saveProject(project: Project, thumbnail?: Blob | null): Promise<void> {
  const d = await database();
  const previous = thumbnail === undefined ? await d.get("projects", project.id) : undefined;
  await d.put("projects", {
    id: project.id,
    project,
    updatedAt: Date.now(),
    thumbnail: thumbnail === undefined ? (previous?.thumbnail ?? null) : thumbnail,
  });
}

export async function saveMedia(projectId: Id, assetId: Id, file: File): Promise<void> {
  const inOpfs = await writeMediaFile(projectId, assetId, file);
  // (If the tab closes between these two writes, loadMedia still finds the OPFS file.)
  await (await database()).put("media", {
    assetId,
    projectId,
    file: inOpfs ? null : file,
    name: file.name,
    type: file.type,
  });
}

/** Assets whose move to OPFS failed this session (e.g. storage nearly full): don't retry every open. */
const moveFailed = new Set<Id>();

/**
 * The stored media file. `projectId` lets it find a file whose record was never written (the
 * tab closed mid-save); `orphan` also names it then.
 */
export async function loadMedia(
  assetId: Id,
  orphan?: { projectId: Id; name: string; type: string },
): Promise<File | null> {
  const d = await database();
  const stored = await d.get("media", assetId);
  if (!stored) {
    if (!orphan) return null;
    const bytes = await readMediaFile(orphan.projectId, assetId);
    if (!bytes || bytes.size === 0) return null;
    await d.put("media", { assetId, projectId: orphan.projectId, file: null, name: orphan.name, type: orphan.type });
    return new File([bytes], orphan.name, { type: orphan.type });
  }
  const { projectId, name, type } = stored;
  let bytes: Blob | null = stored.file;
  if (bytes) {
    // Saved to IndexedDB by an older version (or while OPFS failed): move it to OPFS now.
    // Only drop the IndexedDB copy once the OPFS file reads back.
    const moved =
      !moveFailed.has(assetId) && (await writeMediaFile(projectId, assetId, bytes)) ? await readMediaFile(projectId, assetId) : null;
    if (!moved) moveFailed.add(assetId);
    if (moved) {
      await d.put("media", { ...stored, file: null });
      bytes = moved;
    }
  } else {
    bytes = await readMediaFile(projectId, assetId);
  }
  return bytes ? new File([bytes], name, { type }) : null;
}

export async function deleteProject(id: Id): Promise<void> {
  const d = await database();
  const tx = d.transaction(["projects", "media"], "readwrite");
  await tx.objectStore("projects").delete(id);
  const media = tx.objectStore("media");
  for (const key of await media.index("projectId").getAllKeys(id)) await media.delete(key);
  await tx.done;
  await deleteProjectFiles(id);
}

export async function listStyles(): Promise<SavedStyle[]> {
  return (await (await database()).getAll("styles")).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveStyle(style: SavedStyle): Promise<void> {
  await (await database()).put("styles", style);
}

export async function deleteStyle(id: Id): Promise<void> {
  await (await database()).delete("styles", id);
}
