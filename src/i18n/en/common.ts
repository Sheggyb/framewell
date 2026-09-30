import { plural } from "../types";

/** Words used all over the app. */
export const common = {
  appName: "Framewell",
  done: "Done",
  cancel: "Cancel",
  close: "Close",
  back: "Back",
  delete: "Delete",
  keep: "Keep",
  undo: "Undo",
  redo: "Redo",
  retry: "Try again",
  language: "Language",
  languageButton: "Language: {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — free video editor for creators",
    editor: "Editor · Framewell",
    privacy: "Privacy · Framewell",
    terms: "Terms · Framewell",
  },
  clips: plural({ one: "{count} clip", other: "{count} clips" }),
  videos: plural({ one: "{count} video", other: "{count} videos" }),
  timeAgo: {
    justNow: "just now",
  },
};
