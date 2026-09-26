import { describe, expect, it } from "vitest";
import { gradeParams, DEFAULT_CLIP_COLOR } from "./color";
import { migrateProject } from "./migrate";
import {
  addAudioAt,
  addMarker,
  appendAsset,
  editPoints,
  getTrack,
  insertFreezeFrame,
  nextEditPoint,
  removeMarkerNear,
  setClipSpeed,
  splitAtMarkers,
} from "./ops";
import { createProject, type MediaAsset, type MediaClip } from "./project";
import { secondsToUs } from "./time";

const s = secondsToUs;
const media = (id: string, kind: MediaAsset["kind"] = "video", seconds = 4): MediaAsset => ({
  id,
  kind,
  name: id,
  mimeType: "video/mp4",
  size: 1,
  duration: s(seconds),
  width: 1080,
  height: 1920,
  hasAudio: kind !== "image",
});

describe("speed", () => {
  it("keeps the source span, so the clip gets shorter or longer", () => {
    const p = createProject();
    const a = appendAsset(p, media("a")) as MediaClip;
    const b = appendAsset(p, media("b")) as MediaClip;
    setClipSpeed(p, a.id, 2);
    expect(a.duration).toBe(s(2));
    setClipSpeed(p, a.id, 0.5);
    expect(a.duration).toBe(s(8));
    expect(b.start).toBe(s(8)); // pushed along instead of overlapping
    setClipSpeed(p, a.id, 100);
    expect(a.speed).toBe(8);
  });
});

describe("freeze frame", () => {
  it("inserts a still after the clip that looks the same and pushes the rest", () => {
    const p = createProject();
    const a = appendAsset(p, media("a")) as MediaClip;
    const b = appendAsset(p, media("b")) as MediaClip;
    a.frame.scale = 1.5;
    const id = insertFreezeFrame(p, a.id, media("still", "image", 3), s(1.5))!;
    const main = getTrack(p, "main")!;
    const freeze = main.clips[1] as MediaClip;
    expect(freeze).toMatchObject({ id, start: s(4), duration: s(1.5), volume: 0 });
    expect(freeze.frame.scale).toBe(1.5);
    expect(b.start).toBe(s(5.5));
  });
});

describe("audio lanes", () => {
  it("stacks overlapping audio on new lanes", () => {
    const p = createProject();
    addAudioAt(p, media("music", "audio", 10), 0);
    addAudioAt(p, media("vo1", "audio", 3), s(2));
    addAudioAt(p, media("vo2", "audio", 2), s(20));
    const lanes = p.tracks.filter((t) => t.kind === "audio");
    expect(lanes).toHaveLength(2);
    expect(lanes[1].clips[0].start).toBe(s(2));
    expect(lanes[0].clips.map((c) => c.start)).toEqual([0, s(20)]);
  });
});

describe("beat markers", () => {
  it("adds sorted, de-duplicated markers and removes the nearest", () => {
    const p = createProject();
    addMarker(p, s(2));
    addMarker(p, s(1));
    addMarker(p, s(1.01)); // within one frame: ignored
    expect(p.markers).toEqual([s(1), s(2)]);
    expect(removeMarkerNear(p, s(1.9), s(0.2))).toBe(true);
    expect(p.markers).toEqual([s(1)]);
    expect(removeMarkerNear(p, s(5), s(0.2))).toBe(false);
  });

  it("splits main clips at markers", () => {
    const p = createProject();
    appendAsset(p, media("a"));
    addMarker(p, s(1));
    addMarker(p, s(2.5));
    addMarker(p, s(9)); // past the end: no cut
    expect(splitAtMarkers(p)).toBe(2);
    expect(getTrack(p, "main")!.clips.map((c) => c.start)).toEqual([0, s(1), s(2.5)]);
  });
});

describe("navigation", () => {
  it("jumps between cuts, clip edges and markers", () => {
    const p = createProject();
    appendAsset(p, media("a", "video", 2));
    appendAsset(p, media("b", "video", 3));
    addMarker(p, s(3));
    expect(editPoints(p)).toEqual([0, s(2), s(3), s(5)]);
    expect(nextEditPoint(p, s(0.5), 1)).toBe(s(2));
    expect(nextEditPoint(p, s(2), 1)).toBe(s(3));
    expect(nextEditPoint(p, s(3), -1)).toBe(s(2));
    expect(nextEditPoint(p, 0, -1)).toBe(0);
    expect(nextEditPoint(p, s(5), 1)).toBe(s(5));
  });
});

describe("colour", () => {
  it("is neutral by default and blends filter intensity with manual sliders", () => {
    expect(gradeParams(DEFAULT_CLIP_COLOR)).toBeNull();
    const warm = gradeParams({ filter: "warm", intensity: 0.5, adjust: { ...DEFAULT_CLIP_COLOR.adjust, contrast: 0.2 } })!;
    expect(warm.warmth).toBeCloseTo(0.225);
    expect(warm.contrast).toBeCloseTo(0.2);
    const mono = gradeParams({ filter: "mono", intensity: 1, adjust: { ...DEFAULT_CLIP_COLOR.adjust, saturation: -0.5 } })!;
    expect(mono.saturation).toBe(-1); // clamped
  });

  it("migrates older projects", () => {
    const p = createProject() as unknown as Record<string, unknown>;
    delete p.markers;
    const migrated = migrateProject(JSON.parse(JSON.stringify(p)));
    expect(migrated.markers).toEqual([]);
  });
});
