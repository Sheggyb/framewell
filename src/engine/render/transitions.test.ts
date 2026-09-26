import { describe, expect, it } from "vitest";
import { appendAsset, getTrack, splitClip } from "../model/ops";
import { createProject, type MediaAsset, type MediaClip } from "../model/project";
import { secondsToUs } from "../model/time";
import { transitionAt } from "./transitions";

const s = secondsToUs;
const asset = (id: string): MediaAsset => ({ id, kind: "video", name: id, mimeType: "video/mp4", size: 1, duration: s(4), hasAudio: false });

function twoClips(duration = s(1)) {
  const p = createProject();
  appendAsset(p, asset("a"));
  const b = appendAsset(p, asset("b")) as MediaClip;
  b.transition = { type: "crossfade", duration };
  return { p, main: getTrack(p, "main")!, b };
}

describe("transitionAt", () => {
  it("is centred on the cut and holds edge frames", () => {
    const { main } = twoClips();
    expect(transitionAt(main, s(3.4))).toBeNull();
    const start = transitionAt(main, s(3.5))!;
    expect(start.progress).toBeCloseTo(0);
    expect(start.toTime).toBe(s(4)); // incoming clip holds its first frame
    const end = transitionAt(main, s(4.4))!;
    expect(end.progress).toBeCloseTo(0.9);
    expect(end.fromTime).toBe(s(4) - 1); // outgoing clip holds its last frame
    expect(transitionAt(main, s(4.5))).toBeNull();
  });

  it("is capped by the shorter clip", () => {
    const { p, main, b } = twoClips(s(3));
    const a = main.clips[0] as MediaClip;
    a.duration = s(1);
    b.start = s(1);
    expect(transitionAt(main, s(0.4))).toBeNull();
    expect(transitionAt(main, s(0.6))).not.toBeNull();
    expect(p.tracks.length).toBeGreaterThan(0);
  });

  it("doesn't copy the transition onto a split's right half", () => {
    const { p, b } = twoClips();
    const right = splitClip(p, b.id, s(6))!;
    const rightClip = getTrack(p, "main")!.clips.find((c) => c.id === right) as MediaClip;
    expect(rightClip.transition).toBeNull();
    expect(b.transition).not.toBeNull();
  });
});
