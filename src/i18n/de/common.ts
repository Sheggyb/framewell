import type { common as en } from "../en/common";
import { plural, type Translation } from "../types";

export const common: Translation<typeof en> = {
  appName: "Framewell",
  done: "Fertig",
  cancel: "Abbrechen",
  close: "Schließen",
  back: "Zurück",
  delete: "Löschen",
  keep: "Behalten",
  undo: "Rückgängig",
  redo: "Wiederholen",
  retry: "Nochmal versuchen",
  language: "Sprache",
  languageButton: "Sprache: {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — kostenloser Video-Editor für Creator",
    editor: "Editor · Framewell",
    privacy: "Datenschutz · Framewell",
    terms: "Nutzungsbedingungen · Framewell",
  },
  clips: plural({ one: "{count} Clip", other: "{count} Clips" }),
  videos: plural({ one: "{count} Video", other: "{count} Videos" }),
  timeAgo: {
    justNow: "gerade eben",
  },
};
