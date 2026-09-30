"use client";

import { useEffect } from "react";
import {
  addBeatAtPlayhead,
  addText,
  copySelection,
  cutSelection,
  duplicateSelected,
  pasteClipboard,
  selectAll,
  trimAtPlayhead,
  jumpTo,
  jumpToEditPoint,
  nudgeSelected,
  requestDeleteSelected,
  splitAtPlayhead,
  stepFrames,
  stepSeconds,
} from "@/store/actions";
import type { Messages } from "@/i18n";
import { useEditor } from "@/store/editor";
import { togglePreviewFullscreen } from "./Studio";
import { goBack, overlayOpen } from "./useBackButton";

type ShortcutGroup = keyof Messages["editor"]["shortcuts"]["groups"];
type ShortcutAction = keyof Messages["editor"]["shortcuts"]["actions"];

/**
 * Shown in the keyboard shortcuts sheet (press ?). Keep in sync with `useShortcuts`. Keys are
 * key names (not translated); a row with two entries reads "A or B". Group and action names are
 * keys under `editor.shortcuts`.
 */
export const SHORTCUTS: [group: ShortcutGroup, rows: [keys: string[], action: ShortcutAction][]][] = [
  [
    "playback",
    [
      [["Space", "K"], "playPause"],
      [["← / →"], "stepFrame"],
      [["Shift + ← / →"], "stepSecond"],
      [["J / L"], "stepSecond"],
      [["↑ / ↓"], "jumpCut"],
      [["Home / End"], "jumpEnds"],
    ],
  ],
  [
    "editing",
    [
      [["S"], "split"],
      [["Q"], "trimStart"],
      [["W"], "trimEnd"],
      [["T"], "addText"],
      [["M"], "addBeat"],
      [["Ctrl/⌘ + D"], "duplicate"],
      [["Ctrl/⌘ + C"], "copy"],
      [["Ctrl/⌘ + X"], "cut"],
      [["Ctrl/⌘ + V"], "paste"],
      [["Ctrl/⌘ + A"], "selectAll"],
      [["Shift / Ctrl + 🖱️"], "multiSelect"],
      [["🖱️ ⋯"], "menu"],
      [["🖱️ ⬚"], "boxSelect"],
      [["Delete / Backspace"], "delete"],
      [[", / ."], "nudge"],
      [["Ctrl/⌘ + Z"], "undo"],
      [["Ctrl/⌘ + Shift + Z", "Ctrl + Y"], "redo"],
    ],
  ],
  [
    "view",
    [
      [["+ / −"], "zoom"],
      [["0"], "fit"],
      [["H"], "toggleTimeline"],
      [["F"], "fullscreen"],
      [["Ctrl/⌘ + E"], "export"],
      [["Esc"], "stepBack"],
      [["?"], "showShortcuts"],
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
        } else if (key === "c") {
          e.preventDefault();
          copySelection();
        } else if (key === "x") {
          e.preventDefault();
          cutSelection();
        } else if (key === "v") {
          e.preventDefault();
          pasteClipboard();
        } else if (key === "a") {
          e.preventDefault();
          selectAll();
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
          case "q":
          case "Q":
            trimAtPlayhead("start");
            return true;
          case "w":
          case "W":
            trimAtPlayhead("end");
            return true;
          case "f":
          case "F":
            togglePreviewFullscreen();
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
