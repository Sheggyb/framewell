import { beforeEach, describe, expect, it } from "vitest";
import { addTextClip, findClip } from "@/engine/model/ops";
import { createProject, type TextClip } from "@/engine/model/project";
import { createTextClip } from "@/engine/model/text";
import { templateById } from "@/engine/model/templates";
import { useEditor } from "./editor";

const textOf = (id: string) => (findClip(useEditor.getState().project, id)?.clip as TextClip | undefined)?.text;

describe("live edits", () => {
  let id: string;

  beforeEach(() => {
    useEditor.setState({ project: createProject(), past: [], future: [], liveEdit: null });
    const clip = createTextClip(0);
    id = clip.id;
    useEditor.getState().edit("Add text", (d) => addTextClip(d, clip));
  });

  const type = (text: string) =>
    useEditor.getState().live("Edit text", (d) => {
      (findClip(d, id)!.clip as TextClip).text = text;
    });

  it("groups a burst of changes into one undo step", () => {
    type("H");
    type("Hi");
    type("Hi!");
    useEditor.getState().commitLive();
    expect(textOf(id)).toBe("Hi!");
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text", "Edit text"]);
    useEditor.getState().undo();
    expect(textOf(id)).toBe("Your text");
    useEditor.getState().redo();
    expect(textOf(id)).toBe("Hi!");
  });

  it("commits a pending live edit before a different change", () => {
    type("Hello");
    useEditor.getState().live("Font size", (d) => {
      (findClip(d, id)!.clip as TextClip).style.fontSize = 200;
    });
    useEditor.getState().commitLive();
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text", "Edit text", "Font size"]);
    expect(textOf(id)).toBe("Hello");
  });

  it("jumps back and forward through history", () => {
    type("One");
    useEditor.getState().commitLive();
    useEditor.getState().edit("Font size", (d) => {
      (findClip(d, id)!.clip as TextClip).style.fontSize = 10;
    });
    expect(useEditor.getState().past).toHaveLength(3);
    useEditor.getState().jumpHistory(1);
    expect(textOf(id)).toBe("Your text");
    expect(useEditor.getState().future).toHaveLength(2);
    useEditor.getState().jumpHistory(3);
    expect(textOf(id)).toBe("One");
    expect(useEditor.getState().future).toHaveLength(0);
  });

  it("undo flushes a pending live edit first", () => {
    type("Draft");
    useEditor.getState().undo();
    expect(textOf(id)).toBe("Your text");
    expect(useEditor.getState().future.map((e) => e.label)).toEqual(["Edit text"]);
  });
});

describe("browsing a template", () => {
  const template = templateById("top-5")!;

  beforeEach(() => {
    useEditor.setState({
      project: createProject(),
      past: [],
      future: [],
      liveEdit: null,
      panel: "templates",
      templatePreview: null,
    });
  });

  it("shows the template without touching the project", () => {
    useEditor.getState().setTemplatePreview({ template, lookPreset: "neon" });
    expect(useEditor.getState().templatePreview?.template.id).toBe(template.id);
    expect(useEditor.getState().templatePreview?.lookPreset).toBe("neon");
    expect(useEditor.getState().project.tracks.every((t) => t.clips.length === 0)).toBe(true);
    expect(useEditor.getState().past).toHaveLength(0);
  });

  it("drops the browsed template when another panel opens or the editor moves on", () => {
    useEditor.getState().setTemplatePreview({ template, lookPreset: null });
    useEditor.getState().openPanel("templates");
    expect(useEditor.getState().templatePreview).not.toBeNull();

    useEditor.getState().openPanel("captions");
    expect(useEditor.getState().templatePreview).toBeNull();

    useEditor.getState().setTemplatePreview({ template, lookPreset: null });
    useEditor.getState().openPanel(null);
    expect(useEditor.getState().templatePreview).toBeNull();

    useEditor.getState().setTemplatePreview({ template, lookPreset: null });
    useEditor.getState().openProject(createProject());
    expect(useEditor.getState().templatePreview).toBeNull();
  });
});
