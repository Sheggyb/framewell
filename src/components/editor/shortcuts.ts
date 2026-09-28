"use client";

import { useEffect } from "react";
import {
  addBeatAtPlayhead,
  addText,
  duplicateSelected,
  jumpTo,
  jumpToEditPoint,
  nudgeSelected,
  requestDeleteSelected,
  splitAtPlayhead,
  stepFrames,
  stepSeconds,
} from "@/store/actions";
import { useEditor } from "@/store/editor";
import { goBack, overlayOpen } from "./useBackButton";

/** Shown in the keyboard shortcuts sheet (press ?). Keep in sync with `useShortcuts`. */
export const SHORTCUTS: [group: string, rows: [keys: string, action: string][]][] = [
  [
    "Playback",
    [
      ["Space  or  K", "Play / pause"],
      ["← / →", "Back / forward one frame"],
      ["Shift + ← / →", "Back / forward one second"],
      ["J / L", "Back / forward one second"],
      ["↑ / ↓", "Previous / next cut or beat"],
      ["Home / End", "Go to start / end"],
    ],
  ],
  [
    "Editing",
    [
      ["S", "Split at the playhead"],
      ["T", "Add text"],
      ["M", "Add a beat marker"],
      ["Ctrl/⌘ + D", "Duplicate selected"],
      ["Delete / Backspace", "Delete selected"],
      [", / .", "Nudge selected one frame (Shift: ten)"],
      ["Ctrl/⌘ + Z", "Undo"],
      ["Ctrl/⌘ + Shift + Z  or  Ctrl + Y", "Redo"],
    ],
  ],
  [
    "View",
    [
      ["+ / −", "Zoom the timeline in / out"],
      ["0", "Fit the whole video on the timeline"],
      ["H", "Hide / show the timeline"],
      ["Ctrl/⌘ + E", "Export"],
      ["Esc", "Step back: close sheet, panel, then deselect"],
      ["?", "Show these shortcuts"],
    ],
  ],
];

/** Typing in a field must never trigger shortcuts (sliders and buttons are fine). */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && !["range", "checkbox", "button", "color"].includes(target.type)));

/** Desktop keyboard control of the whole editor. */
export function useShortcuts({ onExport }: { onExport: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.defaultPrevented) return;
      const s = useEditor.getState();
      if (s.confirm || s.dialog) return;
      if (overlayOpen()) {
        if (e.key === "Escape") {
          e.preventDefault();
          goBack();
        }
        return;
      }
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (key === "z" || key === "y") {
          e.preventDefault();
          if (key === "y" || e.shiftKey) s.redo();
          else s.undo();
        } else if (key === "d") {
          e.preventDefault();
          duplicateSelected();
        } else if (key === "e") {
          e.preventDefault();
          onExport();
        }
        return;
      }
      if (e.altKey) return;

      // Arrow keys on a focused slider move the slider, as expected; everywhere else they scrub.
      const onSlider = e.target instanceof HTMLInputElement && e.target.type === "range";
      const handled = (() => {
        switch (e.key) {
          case " ":
          case "k":
          case "K":
            s.togglePlay();
            return true;
          case "ArrowLeft":
            if (onSlider) return false;
            if (e.shiftKey) stepSeconds(-1);
            else stepFrames(-1);
            return true;
          case "ArrowRight":
            if (onSlider) return false;
            if (e.shiftKey) stepSeconds(1);
            else stepFrames(1);
            return true;
          case "ArrowUp":
            if (onSlider) return false;
            jumpToEditPoint(-1);
            return true;
          case "ArrowDown":
            if (onSlider) return false;
            jumpToEditPoint(1);
            return true;
          case "j":
          case "J":
            stepSeconds(-1);
            return true;
          case "l":
          case "L":
            stepSeconds(1);
            return true;
          case "Home":
            jumpTo("start");
            return true;
          case "End":
            jumpTo("end");
            return true;
          case "s":
          case "S":
            splitAtPlayhead();
            return true;
          case "t":
          case "T":
            addText();
            return true;
          case "m":
          case "M":
            addBeatAtPlayhead();
            return true;
          case "Delete":
          case "Backspace":
            requestDeleteSelected();
            return true;
          case ",":
          case "<":
            nudgeSelected(e.shiftKey ? -10 : -1);
            return true;
          case ".":
          case ">":
            nudgeSelected(e.shiftKey ? 10 : 1);
            return true;
          case "+":
          case "=":
            s.setZoom(s.pxPerSecond * 1.4);
            return true;
          case "-":
          case "_":
            s.setZoom(s.pxPerSecond / 1.4);
            return true;
          case "0":
            s.zoomToFit();
            return true;
          case "h":
          case "H":
            s.setTimelineCollapsed(!s.timelineCollapsed);
            return true;
          case "?":
            s.openDialog("shortcuts");
            return true;
          case "Escape":
            goBack();
            return true;
          default:
            return false;
        }
      })();
      // preventDefault also stops Space from "clicking" a focused button a second time.
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExport]);
}
