import { describe, expect, it } from "vitest";
import { clipEnd } from "./ops";
import { createProject, type TextClip } from "./project";
import { presetById, TEXT_PRESETS, STICKER_PRESETS } from "./text";
import { applyTemplate, TEMPLATE_CATEGORIES, TEMPLATE_LOOKS, TEXT_TEMPLATES, templateById, templateClips, templateShowcaseOffset } from "./templates";

const knownPresets = new Set([...TEXT_PRESETS, ...STICKER_PRESETS].map((p) => p.id));

describe("template library", () => {
  it("has unique ids, known presets and every category filled", () => {
    const ids = TEXT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TEXT_TEMPLATES.length).toBeGreaterThanOrEqual(50);
    for (const t of TEXT_TEMPLATES) {
      expect(t.layers.length).toBeGreaterThan(0);
      for (const layer of t.layers) {
        expect(knownPresets.has(layer.preset), `${t.id}: ${layer.preset}`).toBe(true);
        expect(layer.at ?? 0).toBeLessThan(t.duration);
      }
    }
    for (const c of TEMPLATE_CATEGORIES) expect(TEXT_TEMPLATES.some((t) => t.category === c.id)).toBe(true);
    for (const look of TEMPLATE_LOOKS) if (look.preset) expect(knownPresets.has(look.preset)).toBe(true);
  });

  it("every layer's clip stays inside the template and has a real length", () => {
    for (const t of TEXT_TEMPLATES) {
      const clips = templateClips(t, 1_000_000, 30);
      for (const clip of clips) {
        expect(clip.start).toBeGreaterThanOrEqual(1_000_000);
        expect(clip.duration).toBeGreaterThan(0);
        expect(clipEnd(clip)).toBeLessThanOrEqual(1_000_000 + t.duration * 1_000_000 + 1);
      }
    }
  });
});

describe("applyTemplate", () => {
  it("adds one text clip per layer at the playhead, with the pre-written text", () => {
    const project = createProject();
    const template = templateById("top-5")!;
    const ids = applyTemplate(project, template, 2_000_000);
    const clips = project.tracks.flatMap((t) => t.clips) as TextClip[];
    expect(ids).toHaveLength(template.layers.length);
    expect(clips.map((c) => c.text)).toContain("TOP 5");
    expect(Math.min(...clips.map((c) => c.start))).toBe(2_000_000);
    // Overlapping layers go on separate text lanes.
    for (const track of project.tracks) {
      const sorted = [...track.clips].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i].start).toBeGreaterThanOrEqual(clipEnd(sorted[i - 1]));
    }
  });

  it("a look restyles every layer except emoji", () => {
    const project = createProject();
    applyTemplate(project, templateById("wait-for-it")!, 0, "neon");
    const clips = project.tracks.flatMap((t) => t.clips) as TextClip[];
    const text = clips.find((c) => c.text === "WAIT FOR IT")!;
    const emoji = clips.find((c) => c.text === "👀")!;
    expect(text.style.fontId).toBe(presetById("neon").style.fontId);
    expect(emoji.style.fontId).toBe("emoji");
  });
});

describe("templateShowcaseOffset", () => {
  it("lands inside the template and shows every layer at once", () => {
    for (const t of TEXT_TEMPLATES) {
      const at = 5_000_000;
      const offset = templateShowcaseOffset(t);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(t.duration * 1_000_000);

      // At that moment every layer of a template is on screen at least once, so a preview of it
      // is never a blank or half-finished picture.
      const showcase = at + offset;
      const clips = templateClips(t, at, 30);
      expect(clips.length).toBeGreaterThan(0);
      for (const clip of clips) {
        expect(clip.start).toBeLessThanOrEqual(showcase);
      }
      expect(clips.some((c) => showcase >= c.start && showcase < clipEnd(c))).toBe(true);
    }
  });
});
