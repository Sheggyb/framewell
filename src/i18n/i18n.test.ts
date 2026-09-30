import { describe, expect, it } from "vitest";
import { TEXT_TEMPLATES } from "@/engine/model/templates";
import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { sv } from "./sv";
import type { Plural } from "./types";

const LOCALES = { sv, es, de, fr, ar };

type Node = string | Plural | { [k: string]: Node };
const isPlural = (n: unknown): n is Plural => typeof n === "object" && n !== null && "other" in n && typeof (n as Plural).other === "string";

/** Every text leaf as [key, text] (plural forms as key#form). */
function leaves(node: Node, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  if (isPlural(node)) return Object.entries(node).map(([form, text]) => [`${prefix}#${form}`, text as string]);
  return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

/** The parts a translation must keep: {placeholders} and <tag> names. */
const tokens = (text: string) =>
  [...text.matchAll(/\{(\w+)\}|<\/?(\w+)>/g)].map((m) => (m[1] ? `{${m[1]}}` : `<${m[2]}>`)).sort();

const enTexts: Record<string, unknown> = { ...en };
delete enTexts.labels;
delete enTexts.templateTexts;
const englishTokens = new Map(leaves(enTexts as unknown as Node).map(([k, v]) => [k.split("#")[0], tokens(v)]));

describe.each(Object.entries(LOCALES))("%s", (locale, messages) => {
  if (messages === en) {
    it.skip("not translated yet", () => {});
    return;
  }
  const { labels, templateTexts, ...texts } = messages;

  it("keeps every {placeholder} and <tag> of the English text", () => {
    const problems: string[] = [];
    for (const [key, text] of leaves(texts as unknown as Node)) {
      const want = englishTokens.get(key.split("#")[0]);
      if (!want) continue;
      // Plural forms may drop {count} (e.g. Arabic "one" says "a single…"); nothing else may change.
      const got = tokens(text).filter((t) => t !== "{count}");
      const expected = want.filter((t) => t !== "{count}");
      if (JSON.stringify(got) !== JSON.stringify(expected)) problems.push(`${key}: ${text}`);
    }
    expect(problems).toEqual([]);
  });

  it("has no empty texts", () => {
    expect(leaves(texts as unknown as Node).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });

  it("translates each template layer by layer", () => {
    const problems: string[] = [];
    for (const t of TEXT_TEMPLATES) {
      const words = templateTexts[t.id];
      if (!words) problems.push(`${t.id}: missing`);
      else if (words.length !== t.layers.length) problems.push(`${t.id}: ${words.length} texts for ${t.layers.length} layers`);
    }
    expect(problems).toEqual([]);
  });

  it("names things the engine has", () => {
    expect(Object.keys(labels).length).toBeGreaterThan(0);
    expect(labels.templateName && Object.keys(labels.templateName).length).toBe(TEXT_TEMPLATES.length);
    void locale;
  });
});
