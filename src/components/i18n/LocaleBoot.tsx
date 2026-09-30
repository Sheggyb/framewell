"use client";

import { useEffect } from "react";
import { detectLocale, useI18n } from "@/i18n";

/** Starts the app in the saved language, or the phone's language when we have it. */
export function LocaleBoot() {
  useEffect(() => {
    void useI18n.getState().setLocale(detectLocale(), false);
  }, []);
  return null;
}

/**
 * Runs before the page paints, so a right-to-left language doesn't flash left-to-right first.
 * Mirrors detectLocale() in src/i18n; keep them in sync.
 */
export const LOCALE_HEAD_SCRIPT = `try{var k="framewell:locale",s=["en","sv","es","de","fr","ar"],l=localStorage.getItem(k);if(s.indexOf(l)<0){l="en";var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=(n[i]||"").toLowerCase().split("-")[0];if(s.indexOf(b)>=0){l=b;break}}}document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}`;
