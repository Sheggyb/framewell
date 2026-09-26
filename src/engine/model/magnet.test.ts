import { describe, expect, it } from "vitest";
import { appendAsset, deleteClip, getTrack, moveClip, setMainMagnet, trimClip } from "./ops";
import { createProject, type MediaAsset } from "./project";
import { secondsToUs } from "./time";
import { transitionAt } from "../render/transitions";

const s = secondsToUs;
const photo = (id: string): MediaAsset => ({ id, kind: "image", name: id, mimeType: "image/png", size: 1, duration: s(3), hasAudio: false });

function twoPhotos() {
  const p = createProject();
  const a = appendAsset(p, photo("a"));
  const b = appendAsset(p, photo("b"));
  return { p, a, b, main: getTrack(p, "main")! };
}

describe("free main track (magnet off, the default)", () => {
  it("lets a photo start anywhere, like text, without overlapping", () => {
    const { p, a, b } = twoPhotos();
    moveClip(p, b.id, s(5));
    expect(b.start).toBe(s(5)); // leaves a 2 s gap
    moveClip(p, b.id, s(1));
    expect(b.start).toBe(s(3)); // stops at the photo before it
    moveClip(p, b.id, s(6));
    moveClip(p, a.id, s(1.5));
    expect(a.start).toBe(s(1.5)); // the first photo can move into the gap too
    moveClip(p, a.id, s(5));
    expect(a.start).toBe(s(3)); // but stops where the next photo begins
  });

  it("keeps gaps on delete and doesn't trim into a neighbour", () => {
    const { p, a, b } = twoPhotos();
    moveClip(p, b.id, s(6));
    trimClip(p, a.id, "end", s(10));
    expect(a.duration).toBe(s(6)); // up to where b starts
    deleteClip(p, a.id);
    expect(b.start).toBe(s(6));
  });

  it("has no transition across a gap", () => {
    const { p, b, main } = twoPhotos();
    if (b.type === "media") b.transition = { type: "crossfade", duration: s(1) };
    expect(transitionAt(main, s(3))).not.toBeNull();
    moveClip(p, b.id, s(4));
    expect(transitionAt(main, s(4))).toBeNull();
  });

  it("packs everything together when the magnet is switched on", () => {
    const { p, b } = twoPhotos();
    moveClip(p, b.id, s(8));
    setMainMagnet(p, true);
    expect(b.start).toBe(s(3));
    moveClip(p, b.id, s(8));
    expect(b.start).toBe(s(3)); // magnetic clips don't move freely
  });
});
