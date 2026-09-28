import { beforeEach, describe, expect, it } from "vitest";
import { planAudio } from "@/engine/audio/plan";
import { addTextClip, appendAsset, findClip, getTrack, splitClip } from "@/engine/model/ops";
import { createProject, type MediaAsset, type MediaClip, type TextClip } from "@/engine/model/project";
import { createTextClip } from "@/engine/model/text";
import { templateById } from "@/engine/model/templates";
import { zoomAt } from "@/engine/model/zoom";
import { useEditor } from "./editor";

const video = (id: string, seconds = 10): MediaAsset => ({
  id,
  kind: "video",
  name: `${id}.mp4`,
  mimeType: "video/mp4",
  size: 1,
  duration: seconds * 1_000_000,
  width: 1920,
  height: 1080,
  hasAudio: true,
});

describe("split", () => {
  it("keeps fades at the outer ends, so the sound doesn't dip at the cut", () => {
    const p = createProject();
    const clip = appendAsset(p, video("a")) as MediaClip;
    clip.fadeIn = 1_000_000;
    clip.fadeOut = 1_000_000;
    const rightId = splitClip(p, clip.id, 5_000_000)!;
    const right = findClip(p, rightId)!.clip as MediaClip;
    expect([clip.fadeIn, clip.fadeOut]).toEqual([1_000_000, 0]);
    expect([right.fadeIn, right.fadeOut]).toEqual([0, 1_000_000]);
  });

  it("carries a camera move across the cut instead of restarting it", () => {
    const p = createProject();
    const clip = appendAsset(p, video("a")) as MediaClip;
    clip.zoom.motion = "push-in";
    clip.zoom.strength = 1;
    const before = zoomAt(clip, 5_000_000).scale;
    const rightId = splitClip(p, clip.id, 5_000_000)!;
    const right = findClip(p, rightId)!.clip as MediaClip;
    expect(zoomAt(right, 5_000_000).scale).toBeCloseTo(before);
    expect(zoomAt(clip, 4_999_999).scale).toBeCloseTo(before, 3);
    expect(zoomAt(right, 10_000_000).scale).toBeCloseTo(1.3);
  });
});

describe("hidden tracks", () => {
  it("are silent too", () => {
    const p = createProject();
    appendAsset(p, video("a"));
    expect(planAudio(p, 0)).toHaveLength(1);
    getTrack(p, "main")!.hidden = true;
    expect(planAudio(p, 0)).toHaveLength(0);
  });
});

describe("editor store fixes", () => {
  let textId: string;
  beforeEach(() => {
    useEditor.setState({ project: createProject(), past: [], future: [], liveEdit: null, panel: null, selectedClipId: null, templatePreview: null });
    const clip = createTextClip(0);
    textId = clip.id;
    useEditor.getState().edit("Add text", (d) => addTextClip(d, clip));
  });

  it("selecting a clip drops a browsed template from the preview", () => {
    const s = useEditor.getState();
    s.openPanel("templates");
    s.setTemplatePreview({ template: templateById("pov")!, lookPreset: null });
    s.select(textId);
    expect(useEditor.getState().templatePreview).toBeNull();
  });

  it("undoing a clip's creation closes that clip's panel", () => {
    const s = useEditor.getState();
    s.select(textId);
    s.openPanel("color");
    s.undo();
    expect(useEditor.getState().selectedClipId).toBeNull();
    expect(useEditor.getState().panel).toBeNull();
  });

  it("Cancel takes back a picker's changes even when the history is full", () => {
    const s = useEditor.getState();
    for (let i = 0; i < 205; i++) s.edit(`Step ${i}`, (d) => void (d.name = `n${i}`));
    s.select(textId);
    s.openPanel("style");
    for (let i = 0; i < 3; i++) {
      s.edit("Try", (d) => {
        (findClip(d, textId)!.clip as TextClip).text = `try ${i}`;
      });
    }
    s.revertPanel();
    expect((findClip(useEditor.getState().project, textId)!.clip as TextClip).text).toBe("Your text");
  });

  it("previewing an animation keeps a picker's try-out as one open edit", () => {
    const s = useEditor.getState();
    s.live("Style", (d) => void ((findClip(d, textId)!.clip as TextClip).text = "A"));
    s.play(0, 1_000_000, 0, true);
    expect(useEditor.getState().liveEdit).not.toBeNull();
    s.pause();
    s.commitLive();
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text", "Style"]);
  });
});
