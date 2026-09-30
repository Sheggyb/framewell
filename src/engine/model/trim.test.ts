import { describe, expect, it } from "vitest";
import { appendAsset, findClip, getTrack, trimToTime } from "./ops";
import { createProject, type MediaAsset, type MediaClip } from "./project";

const video = (id: string): MediaAsset => ({ id, kind: "video", name: `${id}.mp4`, mimeType: "video/mp4", size: 1, duration: 4_000_000, width: 1920, height: 1080, hasAudio: false });

describe("trimToTime", () => {
  it("cuts away the start up to the playhead, keeping the rest of the footage in place", () => {
    const p = createProject();
    const clip = appendAsset(p, video("a")) as MediaClip;
    expect(trimToTime(p, clip.id, "start", 1_000_000)).toBe(true);
    expect(clip.start).toBe(1_000_000);
    expect(clip.duration).toBe(3_000_000);
    expect(clip.sourceIn).toBe(1_000_000);
  });

  it("cuts away the end after the playhead", () => {
    const p = createProject();
    const clip = appendAsset(p, video("a"));
    expect(trimToTime(p, clip.id, "end", 2_500_000)).toBe(true);
    expect(clip.duration).toBe(2_500_000);
  });

  it("with the magnet on, closes the gap on the main track", () => {
    const p = createProject();
    p.mainMagnet = true;
    appendAsset(p, video("a"));
    const second = appendAsset(p, video("b"));
    trimToTime(p, second.id, "start", 5_000_000);
    const moved = findClip(p, second.id)!.clip;
    expect(moved.start).toBe(4_000_000);
    expect(moved.duration).toBe(3_000_000);
    expect(getTrack(p, "main")!.clips).toHaveLength(2);
  });

  it("does nothing when the playhead is outside the clip", () => {
    const p = createProject();
    const clip = appendAsset(p, video("a"));
    expect(trimToTime(p, clip.id, "start", 0)).toBe(false);
    expect(trimToTime(p, clip.id, "end", 9_000_000)).toBe(false);
    expect(clip.duration).toBe(4_000_000);
  });
});
