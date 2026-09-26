import { describe, expect, it } from "vitest";
import { appendAsset, getTrack } from "../model/ops";
import { createProject, type MediaAsset, type MediaClip } from "../model/project";
import { secondsToUs } from "../model/time";
import { gainAt, planAudio } from "./plan";

const s = secondsToUs;
const asset = (id: string, hasAudio = true, kind: MediaAsset["kind"] = "video"): MediaAsset => ({
  id,
  kind,
  name: id,
  mimeType: "video/mp4",
  size: 1,
  duration: s(4),
  hasAudio,
});

describe("planAudio", () => {
  it("plans clips with audio from the playhead onward", () => {
    const p = createProject();
    appendAsset(p, asset("a"));
    appendAsset(p, asset("silent", false));
    const c = appendAsset(p, asset("c")) as MediaClip;
    c.sourceIn = s(1);
    const plans = planAudio(p, s(1));
    expect(plans.map((x) => [x.assetId, x.when, x.offset, x.duration])).toEqual([
      ["a", 0, 1, 3],
      ["c", 7, 1, 4],
    ]);
  });

  it("skips muted tracks and silent clips", () => {
    const p = createProject();
    const a = appendAsset(p, asset("a")) as MediaClip;
    a.volume = 0;
    appendAsset(p, asset("m", true, "audio"));
    getTrack(p, "audio")!.muted = true;
    expect(planAudio(p, 0)).toEqual([]);
  });
});

describe("gainAt", () => {
  const plan = { volume: 0.8, clipDuration: 4, fadeIn: 1, fadeOut: 2 };
  it("ramps in and out", () => {
    expect(gainAt(plan, 0)).toBe(0);
    expect(gainAt(plan, 0.5)).toBeCloseTo(0.4);
    expect(gainAt(plan, 1.5)).toBeCloseTo(0.8);
    expect(gainAt(plan, 3)).toBeCloseTo(0.4);
    expect(gainAt(plan, 4)).toBe(0);
  });
});
