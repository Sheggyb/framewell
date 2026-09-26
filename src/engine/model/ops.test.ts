import { describe, expect, it } from "vitest";
import { appendAsset, clipAt, deleteClip, getTrack, projectDuration, setPlatform, splitClip } from "./ops";
import { createProject, type MediaAsset, type MediaClip } from "./project";
import { formatTimecode, secondsToUs, snapToFrame } from "./time";

const asset = (id: string, seconds: number, kind: MediaAsset["kind"] = "video"): MediaAsset => ({
  id,
  kind,
  name: `${id}.mp4`,
  mimeType: "video/mp4",
  size: 1,
  duration: secondsToUs(seconds),
  hasAudio: kind !== "image",
});

describe("time", () => {
  it("snaps to frame boundaries", () => {
    expect(snapToFrame(secondsToUs(1.01), 30)).toBe(1_000_000);
    expect(snapToFrame(secondsToUs(1.02), 30)).toBe(1_033_333);
  });

  it("formats timecode as MM:SS:FF", () => {
    expect(formatTimecode(secondsToUs(65.5), 30)).toBe("01:05:15");
    expect(formatTimecode(-5, 30)).toBe("00:00:00");
  });
});

describe("ops", () => {
  it("appends visuals to main and audio to the audio track", () => {
    const p = createProject();
    appendAsset(p, asset("a", 2));
    appendAsset(p, asset("b", 3));
    appendAsset(p, asset("m", 10, "audio"));
    const main = getTrack(p, "main")!;
    expect(main.clips.map((c) => [c.start, c.duration])).toEqual([
      [0, 2_000_000],
      [2_000_000, 3_000_000],
    ]);
    expect(getTrack(p, "audio")!.clips).toHaveLength(1);
    expect(projectDuration(p)).toBe(10_000_000);
  });

  it("splits a clip and offsets the source of the right half", () => {
    const p = createProject();
    const clip = appendAsset(p, asset("a", 4));
    const rightId = splitClip(p, clip.id, secondsToUs(1.5));
    const main = getTrack(p, "main")!;
    expect(rightId).not.toBeNull();
    expect(main.clips).toHaveLength(2);
    const [left, right] = main.clips as MediaClip[];
    expect(left.duration).toBe(1_500_000);
    expect(right).toMatchObject({ id: rightId, start: 1_500_000, duration: 2_500_000, sourceIn: 1_500_000 });
  });

  it("refuses splits that would leave less than a frame", () => {
    const p = createProject();
    const clip = appendAsset(p, asset("a", 1));
    expect(splitClip(p, clip.id, 10_000)).toBeNull();
    expect(splitClip(p, clip.id, 995_000)).toBeNull();
  });

  it("ripple-deletes on the main track with the magnet on", () => {
    const p = createProject();
    p.mainMagnet = true;
    const a = appendAsset(p, asset("a", 2));
    appendAsset(p, asset("b", 3));
    deleteClip(p, a.id);
    const main = getTrack(p, "main")!;
    expect(main.clips).toHaveLength(1);
    expect(main.clips[0].start).toBe(0);
    expect(clipAt(main, 2_999_999)).toBeDefined();
    expect(clipAt(main, 3_000_000)).toBeUndefined();
  });

  it("switches canvas size with the platform", () => {
    const p = createProject("tiktok");
    setPlatform(p, "landscape");
    expect(p.canvas).toMatchObject({ width: 1920, height: 1080 });
  });
});
