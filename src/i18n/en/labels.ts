/**
 * Names of things the engine defines (animations, text styles, transitions, filters, template
 * names…), by id. English falls back to the engine's own label, so these stay empty here;
 * other languages fill them in.
 *
 * Groups used by the clip panels (ids from the engine):
 * - `transition`: TransitionType (src/engine/model/transition.ts), e.g. "crossfade", "dip-black"
 * - `filter`: FILTERS ids (src/engine/model/color.ts)
 * - `adjust`: ColorAdjust keys (src/engine/model/color.ts): exposure, contrast, saturation, warmth,
 *   tint, fade, vignette, grain
 * - `motion`: ZOOM_MOTIONS ids (src/engine/model/zoom.ts)
 * - `punchStyle`: PUNCH_STYLES ids (src/engine/model/zoom.ts)
 *
 * Groups used by the text panels:
 * - `preset`: TEXT_PRESETS and CAPTION_PRESETS ids (src/engine/model/text.ts), e.g. "classic", "cap-bold"
 * - `anim`: text animations as "<part>.<id>" with part in / loop / out and the id from TEXT_IN/OUT/LOOP
 *   (src/engine/model/textAnimation.ts), e.g. "in.pop" (Pop), "out.pop" (Shrink), "loop.pulse".
 *   English names are in src/components/editor/TextPanel.tsx (IN_LABELS…).
 * - `fontCategory`: FONT_CATEGORIES ids (src/lib/fonts.ts): all, clean, bold, script, fun, retro
 * - `templateName`: TEXT_TEMPLATES ids (src/engine/model/templates.ts); fallback is the template's name
 * - `templateCategory`: TEMPLATE_CATEGORIES ids (src/engine/model/templates.ts)
 * - `look`: TEMPLATE_LOOKS ids (src/engine/model/templates.ts)
 * - `stickerText`: label sticker words put into the video, by id from LABELS in
 *   src/components/editor/StickersPanel.tsx, e.g. "link-in-bio" (LINK IN BIO), "dont-skip" (DON'T SKIP)
 */
export const labels: Record<string, Record<string, string>> = {};

/** Pre-written template texts by template id, one entry per layer. Empty in English (the engine has them). */
export const templateTexts: Record<string, readonly string[]> = {};
