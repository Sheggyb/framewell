import { describe, expect, it } from "vitest";
import {
  captionClips,
  CAPTION_Y,
  cuesFromProject,
  formatSrt,
  parseSrt,
  setCaptions,
  splitScript,
  styleCaptions,
  timeEvenly,
} from "./captions";
import { createProject } from "./project";
import { secondsToUs } from "./time";

const s = secondsToUs;

describe("captions", () => {
  it("splits a script into trimmed, non-empty lines", () => {
    expect(splitScript("  Hello there \n\n  second line\r\nthird")).toEqual(["Hello there", "second line", "third"]);
  });

  it("times lines evenly, weighted by word count", () => {
    const cues = timeEvenly(["one", "two words here"], 0, s(4));
    expect(cues.map((c) => [c.start, c.end])).toEqual([
      [0, s(1)],
      [s(1), s(4)],
    ]);
  });

  it("stores captions on a caption track above text, without overlaps", () => {
    const p = createProject();
    setCaptions(
      p,
      [
        { start: s(2), end: s(5), text: "second" },
        { start: 0, end: s(3), text: "first" },
      ],
      "cap-bold",
    );
    const kinds = p.tracks.map((t) => t.kind);
    expect(kinds.indexOf("caption")).toBeGreaterThan(kinds.indexOf("text"));
    const clips = captionClips(p);
    expect(clips.map((c) => [c.text, c.start, c.duration])).toEqual([
      ["first", 0, s(2)],
      ["second", s(2), s(3)],
    ]);
    expect(clips[0].transform.y).toBe(CAPTION_Y);
    expect(clips[0].animation.highlight).not.toBeNull();
  });

  it("restyles every caption", () => {
    const p = createProject();
    setCaptions(p, [{ start: 0, end: s(1), text: "hi" }], "cap-bold");
    styleCaptions(p, "cap-box");
    expect(captionClips(p)[0].style.bgColor).not.toBeNull();
  });
});

describe("srt", () => {
  it("round-trips cues", () => {
    const cues = [
      { start: s(1.5), end: s(3.25), text: "Hello" },
      { start: s(61), end: s(3725.004), text: "Later" },
    ];
    const srt = formatSrt(cues);
    expect(srt).toContain("00:00:01,500 --> 00:00:03,250");
    expect(srt).toContain("01:02:05,004");
    expect(parseSrt(srt)).toEqual(cues);
  });

  it("tolerates CRLF, VTT dots, tags and junk blocks", () => {
    const text = "WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\n<i>Hi</i> there\r\n\r\ngarbage\r\n";
    expect(parseSrt(text)).toEqual([{ start: s(1), end: s(2), text: "Hi there" }]);
  });

  it("reads captions back out of a project", () => {
    const p = createProject();
    setCaptions(p, [{ start: 0, end: s(1), text: "hi" }], "cap-clean");
    expect(cuesFromProject(p)).toEqual([{ start: 0, end: s(1), text: "hi" }]);
  });
});
