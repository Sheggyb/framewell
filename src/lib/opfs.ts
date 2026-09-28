/**
 * Media bytes in the Origin Private File System, at media/<projectId>/<assetId>.
 * OPFS handles large files far better than IndexedDB (notably in iOS Safari) and reads them
 * without loading the whole file. Every function fails soft (false / null) so callers can fall
 * back to IndexedDB where OPFS or `createWritable` is missing. Browser-only.
 */
import type { Id } from "@/engine/model/project";

async function mediaDir(create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle("media", { create });
}

async function projectDir(projectId: Id, create: boolean): Promise<FileSystemDirectoryHandle> {
  return (await mediaDir(create)).getDirectoryHandle(projectId, { create });
}

/**
 * Set once writing turned out to be impossible here: older iOS Safari has OPFS but no
 * `createWritable` outside workers. Remembered so we stop creating files that can't be filled.
 */
let cannotWrite = false;

/** Writes the file; true when it is safely stored. A failed write leaves no partial file behind. */
export async function writeMediaFile(projectId: Id, assetId: Id, data: Blob): Promise<boolean> {
  if (cannotWrite || typeof navigator === "undefined" || typeof navigator.storage?.getDirectory !== "function") return false;
  let dir: FileSystemDirectoryHandle | null = null;
  try {
    dir = await projectDir(projectId, true);
    const handle = await dir.getFileHandle(assetId, { create: true });
    if (typeof handle.createWritable !== "function") {
      cannotWrite = true;
      throw new Error("createWritable unsupported");
    }
    const writable = await handle.createWritable();
    try {
      await writable.write(data);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => {});
      throw error;
    }
    return true;
  } catch {
    await dir?.removeEntry(assetId).catch(() => {});
    return false;
  }
}

export async function readMediaFile(projectId: Id, assetId: Id): Promise<File | null> {
  try {
    return await (await (await projectDir(projectId, false)).getFileHandle(assetId)).getFile();
  } catch {
    return null;
  }
}

export async function deleteProjectFiles(projectId: Id): Promise<void> {
  try {
    await (await mediaDir(false)).removeEntry(projectId, { recursive: true });
  } catch {
    // Nothing stored for this project, or OPFS unavailable.
  }
}
