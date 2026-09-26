import { describe, expect, it } from "vitest";
import { migrateProject } from "./migrate";
import { addPunch, appendAsset, clearZoom, getTrack, punchOnBeats, removePunch, setBackdropForAll, setClipSpeed, splitClip, visiblePunches } from "./ops";
import { createProject, type MediaAsset, type MediaClip, type Project } from "./project";
import { punchAmount, punchSpan, zoomAt } from "./zoom";

const video = (id: string, seconds = 10): MediaAsset => ({
  id,
  kind: "video",
  name: `${id}.mp4`,
  mimeType: "video/mp4",
  size: 1,
  duration: seconds * 1_000_000,
  width: 1920,
  height: 1080,
  hasAudio: false,
});

function setup(): { project: Project; clip: MediaClip } {
  const project = createProject();
  const clip = appendAsset(project, video("a")) as MediaClip;
  return { project, clip };
}

describe("punch-ins", () => {
  it("adds a punch at the playhead in source time and zooms towards its point", () => {
    const { project, clip } = setup();
    const id = addPunch(project, clip.id, 2_000_000, { scale: 1.5, x: 0.25, y: 0.75, style: "snap", hold: 1_000_000 });
    expect(id).not.toBeNull();
    expect(clip.zoom.punches[0].at).toBe(2_000_000);
    expect(zoomAt(clip, 1_999_999).scale).toBe(1);
    const mid = zoomAt(clip, 2_500_000);
    expect(mid.scale).toBeCloseTo(1.5);
    expect(mid.fx).toBeCloseTo(0.25);
    expect(mid.fy).toBeCloseTo(0.75);
    expect(zoomAt(clip, 3_000_000).scale).toBe(1);
  });

  it("eases smooth punches in and out", () => {
    const { project, clip } = setup();
    addPunch(project, clip.id, 1_000_000, { style: "smooth", scale: 2, hold: 500_000 });
    const punch = clip.zoom.punches[0];
    const [start, end] = punchSpan(clip, punch);
    expect(start).toBe(1_000_000);
    expect(end).toBe(1_000_000 + 220_000 * 2 + 500_000);
    expect(punchAmount(clip, punch, start + 110_000)).toBeCloseTo(0.5);
    expect(punchAmount(clip, punch, start + 300_000)).toBe(1);
    expect(punchAmount(clip, punch, end)).toBe(0);
  });

  it("keeps punches on the same footage when the clip is split or sped up", () => {
    const { project, clip } = setup();
    addPunch(project, clip.id, 6_000_000);
    const rightId = splitClip(project, clip.id, 4_000_000)!;
    const right = getTrack(project, "main")!.clips.find((c) => c.id === rightId) as MediaClip;
    expect(visiblePunches(clip)).toHaveLength(0);
    expect(visiblePunches(right)).toHaveLength(1);

    setClipSpeed(project, right.id, 2);
    // Source 6 s is 2 s into the right half's source, i.e. 1 s of timeline at 2×.
    expect(zoomAt(right, right.start + 1_000_000 + 300_000).scale).toBeGreaterThan(1.3);
  });

  it("shortens the hold to stay inside the clip, and ignores times outside it", () => {
    const { project, clip } = setup();
    expect(addPunch(project, clip.id, 11_000_000)).toBeNull();
    addPunch(project, clip.id, 9_500_000, { style: "snap", hold: 2_000_000 });
    const [, end] = punchSpan(clip, clip.zoom.punches[0]);
    expect(end).toBeLessThanOrEqual(clip.start + clip.duration);
  });

  it("punches on every beat inside the clip, and removes / clears them", () => {
    const { project, clip } = setup();
    project.markers = [1_000_000, 2_000_000, 3_000_000, 12_000_000];
    expect(punchOnBeats(project, clip.id, "snap", 1.3)).toBe(3);
    expect(clip.zoom.punches).toHaveLength(3);
    removePunch(project, clip.id, clip.zoom.punches[0].id);
    expect(clip.zoom.punches).toHaveLength(2);
    clip.zoom.motion = "push-in";
    clearZoom(project, clip.id);
    expect(clip.zoom).toEqual({ motion: "none", strength: 0.5, punches: [] });
  });
});

describe("camera moves", () => {
  it("pushes in across the clip", () => {
    const { clip } = setup();
    clip.zoom.motion = "push-in";
    clip.zoom.strength = 1;
    expect(zoomAt(clip, 0).scale).toBeCloseTo(1);
    expect(zoomAt(clip, 10_000_000).scale).toBeCloseTo(1.3);
  });

  it("pans without ever showing the edges", () => {
    const { clip } = setup();
    clip.zoom.motion = "pan-left";
    clip.zoom.strength = 1;
    for (const t of [0, 5_000_000, 10_000_000]) {
      const z = zoomAt(clip, t);
      expect(Math.abs(z.dx)).toBeLessThanOrEqual((z.scale - 1) / 2 + 1e-9);
    }
    expect(zoomAt(clip, 0).dx).toBeGreaterThan(0);
    expect(zoomAt(clip, 10_000_000).dx).toBeLessThan(0);
  });
});

describe("background fill", () => {
  it("defaults to none and can be applied to every main clip", () => {
    const { project, clip } = setup();
    const second = appendAsset(project, video("b")) as MediaClip;
    expect(clip.backdrop.type).toBe("none");
    setBackdropForAll(project, { type: "blur", blur: 0.8, color: "#000000" });
    expect(clip.backdrop).toEqual({ type: "blur", blur: 0.8, color: "#000000" });
    expect(second.backdrop.type).toBe("blur");
  });

  it("migrates v4 clips", () => {
    const { project, clip } = setup();
    const old = JSON.parse(JSON.stringify(project));
    old.version = 4;
    delete old.tracks[0].clips[0].zoom;
    delete old.tracks[0].clips[0].backdrop;
    const migrated = migrateProject(old);
    const c = migrated.tracks[0].clips[0] as MediaClip;
    expect(migrated.version).toBe(5);
    expect(c.zoom).toEqual(clip.zoom);
    expect(c.backdrop).toEqual(clip.backdrop);
  });
});
