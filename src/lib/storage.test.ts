import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteProject, loadMedia, saveMedia } from "./storage";

/** Minimal in-memory OPFS: directories of named Blobs. */
class FakeDir {
  dirs = new Map<string, FakeDir>();
  files = new Map<string, Blob>();
  failWrites = false;

  async getDirectoryHandle(name: string, { create = false } = {}) {
    let dir = this.dirs.get(name);
    if (!dir) {
      if (!create) throw new DOMException("missing", "NotFoundError");
      dir = new FakeDir();
      dir.failWrites = this.failWrites;
      this.dirs.set(name, dir);
    }
    return dir;
  }

  async getFileHandle(name: string, { create = false } = {}) {
    if (!this.files.has(name) && !create) throw new DOMException("missing", "NotFoundError");
    return {
      getFile: async () => new File([this.files.get(name) ?? new Blob()], name),
      createWritable: async () => {
        if (this.failWrites) throw new DOMException("no space", "QuotaExceededError");
        let pending: Blob = new Blob();
        return {
          write: async (data: Blob) => void (pending = data),
          close: async () => void this.files.set(name, pending),
          abort: async () => {},
        };
      },
    };
  }

  async removeEntry(name: string) {
    if (!this.dirs.delete(name) && !this.files.delete(name)) throw new DOMException("missing", "NotFoundError");
  }
}

function useOpfs(root: FakeDir | null) {
  vi.stubGlobal("navigator", {
    storage: {
      getDirectory: async () => {
        if (!root) throw new DOMException("unsupported", "SecurityError");
        return root;
      },
    },
  });
}

let n = 0;
const ids = () => ({ projectId: `p${++n}`, assetId: `a${n}` });
const clip = () => new File(["frames"], "clip.mp4", { type: "video/mp4" });
const opfsFile = (root: FakeDir, projectId: string, assetId: string) =>
  root.dirs.get("media")?.dirs.get(projectId)?.files.get(assetId);

async function expectClip(file: File | null) {
  expect(file?.name).toBe("clip.mp4");
  expect(file?.type).toBe("video/mp4");
  expect(await file?.text()).toBe("frames");
}

afterEach(() => vi.unstubAllGlobals());

describe("media storage", () => {
  it("stores media bytes in OPFS", async () => {
    const root = new FakeDir();
    useOpfs(root);
    const { projectId, assetId } = ids();
    await saveMedia(projectId, assetId, clip());
    expect(await opfsFile(root, projectId, assetId)?.text()).toBe("frames");
    await expectClip(await loadMedia(assetId));
  });

  it("falls back to IndexedDB when OPFS is unavailable", async () => {
    useOpfs(null);
    const { assetId, projectId } = ids();
    await saveMedia(projectId, assetId, clip());
    await expectClip(await loadMedia(assetId));
  });

  it("falls back to IndexedDB when an OPFS write fails", async () => {
    const root = new FakeDir();
    root.failWrites = true;
    useOpfs(root);
    const { assetId, projectId } = ids();
    await saveMedia(projectId, assetId, clip());
    expect(opfsFile(root, projectId, assetId)).toBeUndefined();
    await expectClip(await loadMedia(assetId));
  });

  it("moves media saved in IndexedDB into OPFS when it is loaded", async () => {
    const { assetId, projectId } = ids();
    useOpfs(null);
    await saveMedia(projectId, assetId, clip());

    const root = new FakeDir();
    useOpfs(root);
    await expectClip(await loadMedia(assetId));
    expect(await opfsFile(root, projectId, assetId)?.text()).toBe("frames");

    // The IndexedDB copy is gone: the media now loads from OPFS alone.
    root.dirs.get("media")!.dirs.get(projectId)!.files.set(assetId, new Blob(["from opfs"]));
    expect(await (await loadMedia(assetId))?.text()).toBe("from opfs");
  });

  it("returns null for unknown media", async () => {
    useOpfs(new FakeDir());
    expect(await loadMedia("nope")).toBeNull();
  });

  it("deletes a project's OPFS files with the project", async () => {
    const root = new FakeDir();
    useOpfs(root);
    const { assetId, projectId } = ids();
    await saveMedia(projectId, assetId, clip());
    await deleteProject(projectId);
    expect(root.dirs.get("media")?.dirs.has(projectId)).toBe(false);
    expect(await loadMedia(assetId)).toBeNull();
  });
});
