import type { common as enCommon } from "../en/common";
import { plural, type Translation } from "../types";

export const common: Translation<typeof enCommon> = {
  appName: "Framewell",
  done: "Terminé",
  cancel: "Annuler",
  close: "Fermer",
  back: "Retour",
  delete: "Supprimer",
  keep: "Garder",
  undo: "Annuler",
  redo: "Rétablir",
  retry: "Réessayer",
  language: "Langue",
  languageButton: "Langue : {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — éditeur vidéo gratuit pour les créateurs",
    editor: "Éditeur · Framewell",
    privacy: "Confidentialité · Framewell",
    terms: "Conditions · Framewell",
  },
  clips: plural({ one: "{count} clip", other: "{count} clips" }),
  videos: plural({ one: "{count} vidéo", other: "{count} vidéos" }),
  timeAgo: {
    justNow: "à l’instant",
  },
};
