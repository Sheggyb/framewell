import type { common as en } from "../en/common";
import { plural, type Translation } from "../types";

export const common: Translation<typeof en> = {
  appName: "Framewell",
  done: "Listo",
  cancel: "Cancelar",
  close: "Cerrar",
  back: "Atrás",
  delete: "Eliminar",
  keep: "Conservar",
  undo: "Deshacer",
  redo: "Rehacer",
  retry: "Reintentar",
  language: "Idioma",
  languageButton: "Idioma: {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — editor de vídeo gratis para creadores",
    editor: "Editor · Framewell",
    privacy: "Privacidad · Framewell",
    terms: "Términos · Framewell",
  },
  clips: plural({ one: "{count} clip", other: "{count} clips" }),
  videos: plural({ one: "{count} video", other: "{count} videos" }),
  timeAgo: {
    justNow: "ahora mismo",
  },
};
