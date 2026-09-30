import { common } from "./common";
import { editor } from "./editor";
import { errors } from "./errors";
import { home } from "./home";
import { labels, templateTexts } from "./labels";
import { legal } from "./legal";
import { media } from "./media";
import { text } from "./text";

/** The English dictionary: the source every other language translates. */
export const en = { common, home, legal, editor, text, media, errors, labels, templateTexts };

export type Messages = typeof en;
