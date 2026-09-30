/**
 * App translations. English is built in; other languages load on demand. React components use
 * `useT()`; code outside React (store actions, toasts) uses `t()`.
 *
 *   const t = useT();
 *   t("editor.export.title")                  → "Export video"
 *   t("common.clips", { count: 3 })            → "3 clips"
 *   label("anim", "pop", "Pop")                → a translated engine label, or the fallback
 */
import { create } from "zustand";
import { en, type Messages } from "./en";
import type { KeyOf, Leaf, Plural, Tree, Vars } from "./types";

export type { Messages } from "./en";
export type MessageKey = KeyOf<Messages>;

export const LOCALES = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "sv", name: "Svenska", dir: "ltr" },
  { id: "es", name: "Español", dir: "ltr" },
  { id: "de", name: "Deutsch", dir: "ltr" },
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.id === v);
export const localeDir = (locale: Locale) => LOCALES.find((l) => l.id === locale)!.dir;

/** Where the chosen language is remembered (also read by the tiny script in the page <head>). */
export const LOCALE_KEY = "framewell:locale";

const loaders: Record<Exclude<Locale, "en">, () => Promise<Messages>> = {
  sv: () => import("./sv").then((m) => m.sv),
  es: () => import("./es").then((m) => m.es),
  de: () => import("./de").then((m) => m.de),
  fr: () => import("./fr").then((m) => m.fr),
  ar: () => import("./ar").then((m) => m.ar),
};

interface I18nState {
  locale: Locale;
  messages: Messages;
  /** Switches language (loads it first if needed) and remembers the choice. */
  setLocale: (locale: Locale, remember?: boolean) => Promise<void>;
}

export const useI18n = create<I18nState>()((set, get) => ({
  locale: "en",
  messages: en,
  setLocale: async (locale, remember = true) => {
    if (remember) {
      try {
        localStorage.setItem(LOCALE_KEY, locale);
      } catch {
        // Not remembered; still applies now.
      }
    }
    if (locale === get().locale) return;
    const messages = locale === "en" ? en : await loaders[locale]();
    set({ locale, messages });
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = localeDir(locale);
    }
  },
}));

/** The language to start in: the saved choice, else the first of the phone's languages we have, else English. */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Storage unavailable.
  }
  const wanted = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  for (const tag of wanted) {
    const base = tag?.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

function lookup(messages: Messages, key: string): Leaf | undefined {
  let node: Leaf | Tree | undefined = messages as unknown as Tree;
  for (const part of key.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = (node as Tree)[part];
  }
  return node as Leaf | undefined;
}

const pluralRules = new Map<string, Intl.PluralRules>();

function pick(forms: Plural, count: number, locale: Locale): string {
  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(locale)));
  const form = rules.select(count) as keyof Plural;
  return forms[form] ?? forms.other;
}

const fill = (text: string, vars?: Vars, locale?: Locale) =>
  vars
    ? text.replace(/\{(\w+)\}/g, (all, name: string) => {
        const v = vars[name];
        if (v === undefined) return all;
        return typeof v === "number" ? v.toLocaleString(locale) : v;
      })
    : text;

function translate(state: Pick<I18nState, "locale" | "messages">, key: MessageKey, vars?: Vars): string {
  const found = lookup(state.messages, key) ?? lookup(en, key);
  if (found === undefined) return key;
  if (typeof found === "string") return fill(found, vars, state.locale);
  return fill(pick(found, Number(vars?.count ?? 0), state.locale), vars, state.locale);
}

/** Translates outside React (store actions, toasts). Doesn't re-render anything by itself. */
export const t = (key: MessageKey, vars?: Vars) => translate(useI18n.getState(), key, vars);

/** Translates inside a component, re-rendering it when the language changes. */
export function useT() {
  const locale = useI18n((s) => s.locale);
  const messages = useI18n((s) => s.messages);
  return (key: MessageKey, vars?: Vars) => translate({ locale, messages }, key, vars);
}

/** The current language (for Intl formatting, text direction…). */
export const useLocale = () => useI18n((s) => s.locale);

/** A translated name for something the engine defines (an animation, a filter…), or `fallback`. */
export function label(group: string, id: string, fallback: string): string {
  return useI18n.getState().messages.labels[group]?.[id] ?? fallback;
}

/** `label` for components: re-renders on language change. */
export function useLabel() {
  const labels = useI18n((s) => s.messages.labels);
  return (group: string, id: string, fallback: string) => labels[group]?.[id] ?? fallback;
}

/** Pre-written texts of a template in the current language (undefined: use the template's own). */
export const templateTexts = (templateId: string): readonly string[] | undefined =>
  useI18n.getState().messages.templateTexts[templateId];

/** "5 min ago", "yesterday"… in the current language. */
export function timeAgo(ms: number, locale: Locale): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return new Date(ms).toLocaleDateString(locale);
}
