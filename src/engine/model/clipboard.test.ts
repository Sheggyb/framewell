import { describe, expect, it } from "vitest";
import { addTextClip, appendAsset, copyClips, deleteClips, findClip, getTrack, pasteClips } from "./ops";
import { createProject, type MediaAsset, type TextClip } from "./project";
import { createTextClip } from "./text";

const video: MediaAsset = { id: "v", kind: "video", name: "v.mp4", mimeType: "video/mp4", size: 1, duration: 2_000_000, width: 1920, height: 1080, hasAudio: true };
const song: MediaAsset = { ...video, id: "s", kind: "audio", name: "s.mp3" };

describe("copy / paste", () => {
  it("pastes clips at the playhead, keeping their spacing, as new clips", () => {
    const p = createProject();
    const v = appendAsset(p, video);
    const text = createTextClip(500_000);
    addTextClip(p, text);
    const items = copyClips(p, [v.id, text.id]);
    const ids = pasteClips(p, items, 10_000_000);
    expect(ids).toHaveLength(2);
    const pastedVideo = findClip(p, ids[0])!;
    const pastedText = findClip(p, ids[1])!.clip as TextClip;
    expect(pastedVideo.track.kind).toBe("main");
    expect(pastedVideo.clip.start).toBe(10_000_000);
    expect(pastedText.start).toBe(10_500_000);
    expect(ids).not.toContain(v.id);
  });

  it("goes to the overlay track when the main track is taken, and sound to an audio lane", () => {
    const p = createProject();
    const v = appendAsset(p, video);
    const s = appendAsset(p, song);
    const ids = pasteClips(p, copyClips(p, [v.id, s.id]), 0);
    expect(findClip(p, ids[0])!.track.kind).toBe("overlay");
    expect(findClip(p, ids[1])!.track.kind).toBe("audio");
  });

  it("skips clips whose media isn't in this project", () => {
    const p = createProject();
    const v = appendAsset(p, video);
    const items = copyClips(p, [v.id]);
    const other = createProject();
    expect(pasteClips(other, items, 0)).toEqual([]);
  });

  it("deletes several clips at once", () => {
    const p = createProject();
    const a = appendAsset(p, video);
    const b = appendAsset(p, { ...video, id: "v2" });
    expect(deleteClips(p, [a.id, b.id, "nope"])).toBe(2);
    expect(getTrack(p, "main")!.clips).toHaveLength(0);
  });
});
