import type { common as en } from "../en/common";
import { plural, type Translation } from "../types";

export const common: Translation<typeof en> = {
  appName: "Framewell",
  done: "تم",
  cancel: "إلغاء",
  close: "إغلاق",
  back: "رجوع",
  delete: "حذف",
  keep: "إبقاء",
  undo: "تراجع",
  redo: "إعادة",
  retry: "حاول مجددًا",
  language: "اللغة",
  languageButton: "اللغة: {name}",
  /** Browser tab titles. */
  titles: {
    home: "Framewell — محرر فيديو مجاني لصنّاع المحتوى",
    editor: "المحرر · Framewell",
    privacy: "الخصوصية · Framewell",
    terms: "الشروط · Framewell",
  },
  clips: plural({
    zero: "لا مقاطع",
    one: "مقطع واحد",
    two: "مقطعان",
    few: "{count} مقاطع",
    many: "{count} مقطعًا",
    other: "{count} مقطع",
  }),
  videos: plural({
    zero: "لا فيديوهات",
    one: "فيديو واحد",
    two: "فيديوهان",
    few: "{count} فيديوهات",
    many: "{count} فيديو",
    other: "{count} فيديو",
  }),
  timeAgo: {
    justNow: "الآن",
  },
};
