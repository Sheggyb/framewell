import { describe, expect, it } from "vitest";
import { addTextClip, appendAsset, deleteClip, duplicateClip, getTrack, moveClip, trimClip } from "./ops";
import { createProject, type MediaAsset, type MediaClip } from "./project";
import { applyPreset, createTextClip, presetById } from "./text";
import {
  STATIC_TEXT_STATE,
  TEXT_IN_ANIMATIONS,
  TEXT_LOOP_ANIMATIONS,
  TEXT_OUT_ANIMATIONS,
  textAnimState,
} from "./textAnimation";
import { secondsToUs } from "./time";

const s = secondsToUs;
const textLanes = (p: ReturnType<typeof createProject>) => p.tracks.filter((t) => t.kind === "text");

describe("text lanes", () => {
  it("stacks overlapping text on new lanes and reuses free ones", () => {
    const p = createProject();
    addTextClip(p, createTextClip(0, s(3)));
    addTextClip(p, createTextClip(s(1), s(3)));
    addTextClip(p, createTextClip(s(3), s(1)));
    const lanes = textLanes(p);
    expect(lanes).toHaveLength(2);
    expect(lanes[0].clips.map((c) => c.start)).toEqual([0, s(3)]);
    expect(lanes[1].clips.map((c) => c.start)).toEqual([s(1)]);
  });

  it("removes an emptied extra lane but keeps the last one", () => {
    const p = createProject();
    const a = createTextClip(0, s(3));
    const b = createTextClip(s(1), s(3));
    addTextClip(p, a);
    addTextClip(p, b);
    deleteClip(p, b.id);
    expect(textLanes(p)).toHaveLength(1);
    deleteClip(p, a.id);
    expect(textLanes(p)).toHaveLength(1);
  });

  it("duplicates text right after the original", () => {
    const p = createProject();
    const a = createTextClip(s(1), s(2));
    addTextClip(p, a);
    const copyId = duplicateClip(p, a.id);
    const lane = textLanes(p)[0];
    expect(lane.clips.map((c) => [c.id === copyId, c.start])).toEqual([
      [false, s(1)],
      [true, s(3)],
    ]);
  });
});

describe("move and trim", () => {
  it("stops a moved clip at its neighbours", () => {
    const p = createProject();
    const a = createTextClip(0, s(2));
    const b = createTextClip(s(5), s(2));
    addTextClip(p, a);
    addTextClip(p, b);
    moveClip(p, b.id, s(1));
    expect(b.start).toBe(s(2));
    moveClip(p, a.id, -s(1));
    expect(a.start).toBe(0);
  });

  it("trims text freely but not below the minimum length", () => {
    const p = createProject();
    const a = createTextClip(s(1), s(2));
    addTextClip(p, a);
    trimClip(p, a.id, "end", s(10));
    expect(a.duration).toBe(s(9));
    trimClip(p, a.id, "start", s(20));
    expect(a.duration).toBe(100_000);
  });

  it("keeps media trims inside the source and re-packs a magnetic main track", () => {
    const p = createProject();
    p.mainMagnet = true;
    const asset: MediaAsset = { id: "v", kind: "video", name: "v", mimeType: "video/mp4", size: 1, duration: s(4), hasAudio: true };
    const first = appendAsset(p, asset) as MediaClip;
    const second = appendAsset(p, { ...asset, id: "w" }) as MediaClip;
    trimClip(p, first.id, "start", s(1));
    expect(first).toMatchObject({ start: 0, duration: s(3), sourceIn: s(1) });
    expect(second.start).toBe(s(3));
    trimClip(p, first.id, "end", s(10));
    expect(first.duration).toBe(s(3));
    expect(getTrack(p, "main")!.clips[1].start).toBe(s(3));
  });
});

describe("presets", () => {
  it("replaces look but keeps text and position", () => {
    const clip = createTextClip(0);
    clip.text = "Hello";
    clip.transform.y = 0.2;
    applyPreset(clip, presetById("typewriter"));
    expect(clip).toMatchObject({ text: "Hello", transform: { y: 0.2 }, animation: { in: "typewriter" } });
    expect(clip.style.fontId).toBe("spacemono");
  });
});

describe("text animation", () => {
  const clip = (overrides: Partial<ReturnType<typeof createTextClip>["animation"]>) => {
    const c = createTextClip(0, s(2));
    c.animation = { ...c.animation, ...overrides };
    return c;
  };

  it("renders every animation type without NaN at every point in time", () => {
    const types = (["in", "out", "loop"] as const).flatMap((part) =>
      (part === "in" ? TEXT_IN_ANIMATIONS : part === "out" ? TEXT_OUT_ANIMATIONS : TEXT_LOOP_ANIMATIONS).map(
        (type) => ({ [part]: type }),
      ),
    );
    for (const overrides of types) {
      const c = clip(overrides);
      for (let t = 0; t <= s(2); t += s(0.05)) {
        const state = textAnimState(c, t);
        for (const value of Object.values(state)) if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
        expect(state.opacity).toBeGreaterThanOrEqual(0);
        expect(state.opacity).toBeLessThanOrEqual(1);
      }
      // Every animation settles back to fully visible in the middle of a long clip (loops aside).
      if (!("loop" in overrides)) expect(textAnimState(c, s(1)).opacity).toBeCloseTo(1);
    }
  });

  it("wipes reveal left to right and erase hides text", () => {
    expect(textAnimState(clip({ in: "wipe", inDuration: s(1) }), s(0.5)).wipeEnd).toBeGreaterThan(0.5);
    expect(textAnimState(clip({ out: "typewriter", outDuration: s(1) }), s(1.5)).reveal).toBeCloseTo(0.5);
    expect(textAnimState(clip({ in: "words", inDuration: s(1) }), s(0.5)).revealBy).toBe("words");
  });

  it("fades in and out", () => {
    const c = clip({ in: "fade", out: "fade" });
    expect(textAnimState(c, 0).opacity).toBe(0);
    expect(textAnimState(c, s(1)).opacity).toBe(1);
    expect(textAnimState(c, s(2)).opacity).toBe(0);
  });

  it("reveals characters for typewriter", () => {
    const c = clip({ in: "typewriter", inDuration: s(1) });
    expect(textAnimState(c, s(0.5)).reveal).toBeCloseTo(0.5);
    expect(textAnimState(c, s(1.5)).reveal).toBe(1);
  });

  it("squeezes in/out into short clips", () => {
    const c = clip({ in: "fade", inDuration: s(2), out: "fade", outDuration: s(2) });
    expect(textAnimState(c, s(1)).opacity).toBeGreaterThan(0.99);
  });

  it("is static with no animations", () => {
    expect(textAnimState(clip({}), s(1))).toEqual({ ...STATIC_TEXT_STATE, progress: 0.5 });
  });
});
