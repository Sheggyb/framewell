# Translations

English in `src/i18n/en/` is the source. Every other language (`sv`, `es`, `de`, `fr`, `ar`) has
exactly the same keys; TypeScript checks this (`Messages` type).

## Using text in code

```tsx
import { useT } from "@/i18n";          // in components (re-renders on language change)
const t = useT();
t("editor.export.title");                 // plain text
t("common.clips", { count: 3 });          // plural (see below)
t("errors.import.unsupported", { name }); // {name} is filled in

import { t } from "@/i18n";               // outside React (store actions, toasts)
```

- **Every user-visible string** goes through `t()`: visible text, `aria-label`, `title`,
  `placeholder`, `alt`, toasts, confirm dialogs, error messages.
- **Don't translate** brand and platform names (Framewell, TikTok, Reels, Shorts, YouTube,
  Instagram, Ko-fi), keyboard key names (Ctrl, Shift, Esc…), file extensions, or code.
- **Keys**: `namespace.screen.item` in camelCase, grouped by screen. Keep the English wording
  exactly as it is today.
- **Variables**: `{name}` placeholders, never string concatenation, so translators can reorder.
- **Plurals**: `plural({ one: "{count} clip", other: "{count} clips" })` from `../types`, used
  as `t(key, { count })`. Never build plurals with `count === 1 ? … : …`.
- **Markup inside a sentence** (bold, links): keep one sentence with tags and render it with
  `<Rich text={t("…")} tags={{ b: (s) => <b>{s}</b>, link: (s) => <Link …>{s}</Link> }} />`
  from `@/components/i18n/Rich`.
- **Engine names** (animations, text styles, transitions, filters, template names, looks…):
  `const L = useLabel(); L("anim", id, engineLabel)` (or `label()` outside React). English
  falls back to the engine's label, so no English entry is needed; groups are listed in
  `en/labels.ts`.
- **Template words** come from `templateTexts(id)` (`@/i18n`); `templateClips(..., texts)` uses them.
- **Engine errors** carry a `code` (`CodedError`): show `t(\`errors.<area>.<code>\`, err.params)`.
- **Server components** can't call hooks: move their text into a small client component.

## Right-to-left (Arabic)

`<html dir="rtl">` is set for Arabic. In UI you touch, prefer logical Tailwind classes:
`ms-*/me-*` (not `ml/mr`), `ps-*/pe-*`, `start-*/end-*` (not `left/right`), `text-start/text-end`,
`rounded-s/e`, `border-s/e`. Arrows and chevrons that point "back/forward" get `rtl:rotate-180`.
The video preview, timeline, tool dial and canvas overlays stay left-to-right (time runs left to
right in every editor); they are wrapped in `dir="ltr"`.
