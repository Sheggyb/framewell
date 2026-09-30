/**
 * `.framewell` backup files: one project plus copies of all its media, in a single file the
 * user keeps (Files app, a drive, another device). Browser-only.
 *
 * Layout (all integers little-endian):
 *   8 bytes   "FWBACKUP"
 *   4 bytes   manifest length N
 *   N bytes   manifest JSON (UTF-8): { format, version, exportedAt, project, media: [{ assetId, name, type, size }] }
 *   …         the media files, back to back, in manifest order
 *
 * The media is stored as-is, so writing and reading a backup never loads whole videos into memory.
 */
import { CodedError } from "@/engine/errors";
import { migrateProject } from "@/engine/model/migrate";
import { newId, type Id, type Project } from "@/engine/model/project";
import { deleteProject, loadMedia, loadProject, saveMedia, saveProject } from "./storage";

const MAGIC = "FWBACKUP";
const FORMAT = "framewell-backup";
const FORMAT_VERSION = 1;
export const BACKUP_EXTENSION = ".framewell";

interface ManifestMedia {
  assetId: Id;
  name: string;
  type: string;
  size: number;
}

interface Manifest {
  format: typeof FORMAT;
  version: number;
  exportedAt: number;
  project: Project;
  media: ManifestMedia[];
}

export interface Backup {
  file: File;
  /** Media that couldn't be included (not stored on this device). */
  missing: string[];
}

export type BackupErrorCode = "not-saved" | "not-backup" | "incomplete" | "damaged" | "newer-version" | "restore-failed";

export class BackupError extends CodedError<BackupErrorCode> {}

const fileSafe = (name: string) => name.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "Framewell project";

/** Builds a backup of a saved project. */
export async function createBackup(projectId: Id): Promise<Backup> {
  const project = await loadProject(projectId);
  if (!project) throw new BackupError("not-saved", "This project isn't saved on this device yet.");
  const media: ManifestMedia[] = [];
  const blobs: Blob[] = [];
  const missing: string[] = [];
  for (const asset of Object.values(project.assets)) {
    const file = await loadMedia(asset.id, { projectId, name: asset.name, type: asset.mimeType }).catch(() => null);
    if (!file) {
      missing.push(asset.name);
      continue;
    }
    media.push({ assetId: asset.id, name: file.name || asset.name, type: file.type || asset.mimeType, size: file.size });
    blobs.push(file);
  }
  const manifest: Manifest = { format: FORMAT, version: FORMAT_VERSION, exportedAt: Date.now(), project, media };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const header = new Uint8Array(12);
  header.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(header.buffer).setUint32(8, json.byteLength, true);
  const file = new File([header, json, ...blobs], `${fileSafe(project.name)}${BACKUP_EXTENSION}`, {
    type: "application/octet-stream",
  });
  return { file, missing };
}

async function readManifest(file: Blob): Promise<{ manifest: Manifest; dataStart: number }> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.byteLength < 12 || new TextDecoder().decode(head.slice(0, 8)) !== MAGIC) {
    throw new BackupError("not-backup", "That isn't a Framewell backup file.");
  }
  const length = new DataView(head.buffer).getUint32(8, true);
  if (12 + length > file.size) throw new BackupError("incomplete", "This backup file is incomplete or damaged.");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(await file.slice(12, 12 + length).text()) as Manifest;
  } catch {
    throw new BackupError("damaged", "This backup file is damaged.");
  }
  if (manifest.format !== FORMAT || !manifest.project) throw new BackupError("not-backup", "That isn't a Framewell backup file.");
  if (manifest.version > FORMAT_VERSION) {
    throw new BackupError("newer-version", "This backup was made by a newer Framewell. Reload the page to update, then try again.");
  }
  return { manifest, dataStart: 12 + length };
}

/**
 * Restores a backup as a new project on this device (the original stays untouched if it's
 * here too). Returns the new project's id.
 */
export async function restoreBackup(file: Blob): Promise<Id> {
  const { manifest, dataStart } = await readManifest(file);
  const project = migrateProject(manifest.project);
  project.id = newId();
  project.updatedAt = Date.now();

  // Fresh asset ids, so deleting one copy never removes the other copy's media.
  const assetIds = new Map<Id, Id>();
  for (const id of Object.keys(project.assets)) assetIds.set(id, newId());
  const assets: Project["assets"] = {};
  for (const [oldId, asset] of Object.entries(project.assets)) {
    const id = assetIds.get(oldId)!;
    assets[id] = { ...asset, id };
  }
  project.assets = assets;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.type === "media") clip.assetId = assetIds.get(clip.assetId) ?? clip.assetId;
    }
  }

  try {
    let offset = dataStart;
    for (const entry of manifest.media) {
      const end = offset + entry.size;
      if (end > file.size) throw new BackupError("incomplete", "This backup file is incomplete or damaged.");
      const id = assetIds.get(entry.assetId);
      if (id) await saveMedia(project.id, id, new File([file.slice(offset, end)], entry.name, { type: entry.type }));
      offset = end;
    }
    await saveProject(project, null);
  } catch (error) {
    // Don't leave half a project (and its media) taking up space.
    await deleteProject(project.id).catch(() => {});
    if (error instanceof BackupError) throw error;
    throw new BackupError("restore-failed", "Couldn't restore this backup. The phone may be out of storage space.");
  }
  return project.id;
}
