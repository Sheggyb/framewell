import type { common as en } from "../en/common";
import { plural, type Translation } from "../types";

export const common: Translation<typeof en> = {
  appName: "Framewell",
  done: "Klar",
  cancel: "Avbryt",
  close: "Stäng",
  back: "Tillbaka",
  delete: "Radera",
  keep: "Behåll",
  undo: "Ångra",
  redo: "Gör om",
  retry: "Försök igen",
  language: "Språk",
  languageButton: "Språk: {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — gratis videoredigerare för kreatörer",
    editor: "Redigerare · Framewell",
    privacy: "Integritet · Framewell",
    terms: "Villkor · Framewell",
  },
  clips: plural({ one: "{count} klipp", other: "{count} klipp" }),
  videos: plural({ one: "{count} video", other: "{count} videor" }),
  timeAgo: {
    justNow: "nyss",
  },
};
