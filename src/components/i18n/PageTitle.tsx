"use client";

import { useEffect } from "react";
import { useI18n, useT } from "@/i18n";

/** Keeps the browser tab title in the app's language (the static page ships the English one). */
export function PageTitle({ page }: { page: "home" | "editor" | "privacy" | "terms" }) {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const title = t(`common.titles.${page}`);
  useEffect(() => {
    document.title = title;
  }, [title, locale]);
  return null;
}
