/**
 * Shapes for translation dictionaries. English (src/i18n/en) is the source; every other
 * language has exactly the same keys (TypeScript checks this).
 */

/**
 * Text that changes with a number ("1 clip" / "3 clips"). `other` is required; languages use
 * the other forms they need (Arabic uses all six). Chosen with Intl.PluralRules.
 */
export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Marks an entry as plural. `{count}` in the text is replaced with the number. */
export const plural = (forms: Plural): Plural => forms;

export type Leaf = string | Plural;

export interface Tree {
  [key: string]: Leaf | Tree;
}

/** Same keys as the English dictionary, any wording. */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Translation<T[K]>;
};

/** "home.hero.title"-style keys for every text in a dictionary. */
export type KeyOf<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : T[K] extends Record<string, unknown> ? `${K}.${KeyOf<T[K]>}` : never;
}[keyof T & string];

export type Vars = Record<string, string | number>;
