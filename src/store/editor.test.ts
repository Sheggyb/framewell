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

describe("draft text", () => {
  let id: string;

  // What addText does: add the clip, mark it as a draft, select it.
  beforeEach(() => {
    useEditor.setState({ project: createProject(), past: [], future: [], liveEdit: null, draftText: null, selectedClipId: null });
    const clip = createTextClip(0);
    id = clip.id;
    const s = useEditor.getState();
    s.edit("Add text", (d) => addTextClip(d, clip));
    s.beginDraftText(id);
    s.select(id);
  });

  const type = (text: string) =>
    useEditor.getState().live("Edit text", (d) => {
      (findClip(d, id)!.clip as TextClip).text = text;
    });

  it("Cancel removes the text and every change made to it, leaving nothing to redo", () => {
    type("Hello");
    useEditor.getState().edit("Italic", (d) => void ((findClip(d, id)!.clip as TextClip).style.italic = true));
    useEditor.getState().resolveDraftText(false);
    expect(textOf(id)).toBeUndefined();
    expect(useEditor.getState().past).toHaveLength(0);
    expect(useEditor.getState().future).toHaveLength(0);
    expect(useEditor.getState().selectedClipId).toBeNull();
  });

  it("Add keeps it as a single undo step", () => {
    type("Hello");
    useEditor.getState().edit("Italic", (d) => void ((findClip(d, id)!.clip as TextClip).style.italic = true));
    useEditor.getState().resolveDraftText(true);
    expect(useEditor.getState().draftText).toBeNull();
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text"]);
    expect(textOf(id)).toBe("Hello");

    useEditor.getState().undo();
    expect(textOf(id)).toBeUndefined();
    useEditor.getState().redo();
    expect(textOf(id)).toBe("Hello");
    expect((findClip(useEditor.getState().project, id)!.clip as TextClip).style.italic).toBe(true);
  });

  it("tapping away drops an untouched draft but keeps one that was typed in", () => {
    useEditor.getState().select(null);
    expect(textOf(id)).toBeUndefined();

    const clip = createTextClip(0);
    useEditor.getState().edit("Add text", (d) => addTextClip(d, clip));
    useEditor.getState().beginDraftText(clip.id);
    useEditor.getState().select(clip.id);
    useEditor.getState().live("Edit text", (d) => void ((findClip(d, clip.id)!.clip as TextClip).text = "Keep me"));
    useEditor.getState().select(null);
    expect(textOf(clip.id)).toBe("Keep me");
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text"]);
  });

  it("undoing the text's creation ends the draft", () => {
    useEditor.getState().undo();
    expect(useEditor.getState().draftText).toBeNull();
  });
});

describe("cancelling a picker", () => {
  let id: string;
  const style = () => (findClip(useEditor.getState().project, id)!.clip as TextClip).style;
  const tryFont = (fontId: string) =>
    useEditor.getState().live("Font", (d) => void ((findClip(d, id)!.clip as TextClip).style.fontId = fontId));

  beforeEach(() => {
    useEditor.setState({ project: createProject(), past: [], future: [], liveEdit: null, draftText: null, panel: null });
    const clip = createTextClip(0);
    id = clip.id;
    useEditor.getState().edit("Add text", (d) => addTextClip(d, clip));
    useEditor.getState().select(id);
    useEditor.getState().openPanel("font");
  });

  it("takes back everything tried since the picker opened, and nothing before", () => {
    tryFont("anton");
    tryFont("pacifico");
    useEditor.getState().commitLive();
    useEditor.getState().edit("Italic", (d) => void ((findClip(d, id)!.clip as TextClip).style.italic = true));
    tryFont("bangers");
    useEditor.getState().revertPanel();
    expect(style().fontId).toBe("montserrat");
    expect(style().italic).toBe(false);
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text"]);
    expect(useEditor.getState().future).toHaveLength(0);
  });

  it("keeps the last pick as one step when closed", () => {
    tryFont("anton");
    tryFont("pacifico");
    useEditor.getState().openPanel(null);
    expect(style().fontId).toBe("pacifico");
    expect(useEditor.getState().past.map((e) => e.label)).toEqual(["Add text", "Font"]);
  });
});

describe("stepping back", () => {
  let id: string;

  beforeEach(() => {
    useEditor.setState({
      project: createProject(),
      past: [],
      future: [],
      liveEdit: null,
      selectedClipId: null,
      panel: null,
      moreOpen: false,
      dialog: null,
      confirm: null,
      draftText: null,
    });
    const clip = createTextClip(0);
    id = clip.id;
    useEditor.getState().edit("Add text", (d) => addTextClip(d, clip));
  });

  it("closes one level at a time, innermost first", () => {
    const s = useEditor.getState();
    s.select(id);
    s.openPanel("style");
    s.setMoreOpen(true);
    s.openDialog("history");
    s.ask({ title: "Delete?", message: "", confirmLabel: "Delete", onConfirm: () => {} });

    const levels = () => {
      const { confirm, dialog, moreOpen, panel, selectedClipId } = useEditor.getState();
      return { confirm: Boolean(confirm), dialog, moreOpen, panel, selectedClipId };
    };
    expect(s.stepBack()).toBe(true);
    expect(levels()).toEqual({ confirm: false, dialog: "history", moreOpen: true, panel: "style", selectedClipId: id });
    expect(s.stepBack()).toBe(true);
    expect(levels()).toEqual({ confirm: false, dialog: null, moreOpen: true, panel: "style", selectedClipId: id });
    expect(s.stepBack()).toBe(true);
    expect(levels()).toEqual({ confirm: false, dialog: null, moreOpen: false, panel: "style", selectedClipId: id });
    expect(s.stepBack()).toBe(true);
    expect(levels()).toEqual({ confirm: false, dialog: null, moreOpen: false, panel: null, selectedClipId: id });
    expect(s.stepBack()).toBe(true);
    expect(levels()).toEqual({ confirm: false, dialog: null, moreOpen: false, panel: null, selectedClipId: null });
    expect(s.stepBack()).toBe(false);
  });

  it("keeps changes made in a panel it closes", () => {
    const s = useEditor.getState();
    s.select(id);
    s.openPanel("size");
    s.edit("Font size", (d) => {
      (findClip(d, id)!.clip as TextClip).style.fontSize = 10;
    });
    s.stepBack();
    expect((findClip(useEditor.getState().project, id)!.clip as TextClip).style.fontSize).toBe(10);
  });
});
