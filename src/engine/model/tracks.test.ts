import { describe, expect, it } from "vitest";
import { planAudio } from "../audio/plan";
import { appendAsset, getTrack, placeAsset, setTrackFlag } from "./ops";
import { createProject, type MediaAsset } from "./project";

const video: MediaAsset = { id: "v", kind: "video", name: "v.mp4", mimeType: "video/mp4", size: 1, duration: 2_000_000, width: 1920, height: 1080, hasAudio: true };

describe("setTrackFlag", () => {
  it("mutes and hides a track, and both silence it", () => {
    const p = createProject();
    appendAsset(p, video);
    const main = getTrack(p, "main")!;
    setTrackFlag(p, main.id, "muted", true);
    expect(main.muted).toBe(true);
    expect(planAudio(p, 0)).toHaveLength(0);
    setTrackFlag(p, main.id, "muted", false);
    setTrackFlag(p, main.id, "hidden", true);
    expect(main.hidden).toBe(true);
    expect(planAudio(p, 0)).toHaveLength(0);
  });

  it("ignores unknown tracks", () => {
    const p = createProject();
    expect(() => setTrackFlag(p, "nope", "muted", true)).not.toThrow();
  });
});

describe("placeAsset", () => {
  const img = (id: string): MediaAsset => ({ id, kind: "image", name: `${id}.png`, mimeType: "image/png", size: 1, duration: 3_000_000, width: 1080, height: 1920, hasAudio: false });

  it("puts a picture on the main track where there is room", () => {
    const p = createProject();
    p.assets.a = img("a");
    const id = placeAsset(p, "a", 5_000_000)!;
    const clip = getTrack(p, "main")!.clips.find((c) => c.id === id)!;
    expect(clip.start).toBe(5_000_000);
  });

  it("uses the overlay track when the main track is busy there", () => {
    const p = createProject();
    appendAsset(p, video); // 0–2 s on main
    p.assets.a = img("a");
    const id = placeAsset(p, "a", 1_000_000)!;
    expect(getTrack(p, "overlay")!.clips.map((c) => c.id)).toContain(id);
  });

  it("with the magnet on, joins the main track at the nearest cut", () => {
    const p = createProject();
    appendAsset(p, video);
    p.mainMagnet = true;
    p.assets.a = img("a");
    placeAsset(p, "a", 1_900_000);
    const main = getTrack(p, "main")!;
    expect(main.clips.map((c) => (c.type === "media" ? c.assetId : ""))).toEqual(["v", "a"]);
    expect(main.clips[1].start).toBe(2_000_000);
  });

  it("puts sound on an audio lane, and ignores unknown assets", () => {
    const p = createProject();
    p.assets.m = { ...img("m"), kind: "audio", hasAudio: true };
    const id = placeAsset(p, "m", 0)!;
    expect(getTrack(p, "audio")!.clips.map((c) => c.id)).toContain(id);
    expect(placeAsset(p, "nope", 0)).toBeNull();
  });
});
