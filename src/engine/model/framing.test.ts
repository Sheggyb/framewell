import { describe, expect, it } from "vitest";
import { migrateProject } from "./migrate";
import { appendAsset, centeredCrop, defaultFrame, getTrack, moveToMain, moveToOverlay, reorderClip } from "./ops";
import { createProject, PROJECT_SCHEMA_VERSION, type MediaAsset, type MediaClip } from "./project";
import { secondsToUs } from "./time";

const s = secondsToUs;
const asset = (id: string, width: number, height: number): MediaAsset => ({
  id,
  kind: "image",
  name: id,
  mimeType: "image/jpeg",
  size: 1,
  duration: s(3),
  width,
  height,
  hasAudio: false,
});

describe("framing", () => {
  it("fills with similar-shaped pictures and fits very different ones", () => {
    const p = createProject(); // 9:16
    expect(defaultFrame(p, asset("portrait", 3024, 4032)).fit).toBe("fill");
    expect(defaultFrame(p, asset("landscape", 1920, 1080)).fit).toBe("fit");
  });

  it("computes centred crops for an aspect ratio", () => {
    // 16:9 source cropped to 9:16: a narrow centred band, full height.
    const c = centeredCrop(16 / 9, 9 / 16);
    expect(c.h).toBe(1);
    expect(c.w).toBeCloseTo(9 / 16 / (16 / 9));
    expect(c.x + c.w / 2).toBeCloseTo(0.5);
    // 9:16 source cropped to 1:1: full width, centred vertically.
    const sq = centeredCrop(9 / 16, 1);
    expect(sq).toMatchObject({ x: 0, w: 1 });
    expect(sq.y + sq.h / 2).toBeCloseTo(0.5);
    expect(centeredCrop(1, null)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe("reorder and overlays", () => {
  it("reorders main clips and re-packs", () => {
    const p = createProject();
    p.mainMagnet = true;
    const a = appendAsset(p, asset("a", 1080, 1920));
    const b = appendAsset(p, asset("b", 1080, 1920));
    const c = appendAsset(p, asset("c", 1080, 1920));
    reorderClip(p, c.id, 0);
    const main = getTrack(p, "main")!;
    expect(main.clips.map((x) => x.id)).toEqual([c.id, a.id, b.id]);
    expect(main.clips.map((x) => x.start)).toEqual([0, s(3), s(6)]);
  });

  it("lifts a clip to the overlay track and back", () => {
    const p = createProject();
    const a = appendAsset(p, asset("a", 1080, 1920));
    const b = appendAsset(p, asset("b", 1080, 1920));
    moveToOverlay(p, b.id, s(1));
    const kinds = p.tracks.map((t) => t.kind);
    expect(kinds.indexOf("overlay")).toBe(kinds.indexOf("main") + 1);
    const overlay = getTrack(p, "overlay")!.clips[0] as MediaClip;
    expect(overlay).toMatchObject({ id: b.id, start: s(1) });
    expect(overlay.frame.scale).toBe(0.5);
    expect(getTrack(p, "main")!.clips.map((x) => x.id)).toEqual([a.id]);

    p.mainMagnet = true;
    moveToMain(p, b.id, 0);
    expect(getTrack(p, "main")!.clips.map((x) => x.id)).toEqual([b.id, a.id]);
    expect((getTrack(p, "main")!.clips[0] as MediaClip).frame.scale).toBe(1);
  });
});

describe("migration", () => {
  it("fills in fields added after v1", () => {
    const p = createProject();
    const clip = appendAsset(p, asset("a", 100, 100)) as unknown as Record<string, unknown>;
    delete clip.frame;
    delete clip.crop;
    delete clip.transition;
    const migrated = migrateProject(JSON.parse(JSON.stringify({ ...p, version: 1 })));
    const m = getTrack(migrated, "main")!.clips[0] as MediaClip;
    expect(migrated.version).toBe(PROJECT_SCHEMA_VERSION);
    expect(m.frame.fit).toBe("fit");
    expect(m.crop).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(m.transition).toBeNull();
  });
});
