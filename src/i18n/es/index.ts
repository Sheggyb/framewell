import type { Messages } from "../en";
import { common } from "./common";
import { editor } from "./editor";
import { errors } from "./errors";
import { home } from "./home";
import { labels, templateTexts } from "./labels";
import { legal } from "./legal";
import { media } from "./media";
import { text } from "./text";

/** The Spanish dictionary. */
export const es: Messages = { common, home, legal, editor, text, media, errors, labels, templateTexts };
