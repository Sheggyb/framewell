/**
 * On-device persistence: projects (JSON) and their media files (Blobs) in IndexedDB.
 * Nothing leaves the device. Browser-only.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { migrateProject } from "@/engine/model/migrate";
import { projectDuration } from "@/engine/model/ops";
import type { Id, Project } from "@/engine/model/project";
import type { TextAnimation, TextStyle } from "@/engine/model/text";

interface StoredProject {
  id: Id;
  project: Project;
  updatedAt: number;
  thumbnail: Blob | null;
}

interface StoredMedia {
  assetId: Id;
  projectId: Id;
  file: Blob;
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
  await (await database()).put("media", { assetId, projectId, file, name: file.name, type: file.type });
}

export async function loadMedia(assetId: Id): Promise<File | null> {
  const stored = await (await database()).get("media", assetId);
  return stored ? new File([stored.file], stored.name, { type: stored.type }) : null;
}

export async function deleteProject(id: Id): Promise<void> {
  const d = await database();
  const tx = d.transaction(["projects", "media"], "readwrite");
  await tx.objectStore("projects").delete(id);
  const media = tx.objectStore("media");
  for (const key of await media.index("projectId").getAllKeys(id)) await media.delete(key);
  await tx.done;
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
