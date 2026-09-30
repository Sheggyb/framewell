"use client";

import { Check, Search, Shuffle } from "lucide-react";
import { useState, useContext } from "react";
import {
  layerPreset,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LOOKS,
  TEXT_TEMPLATES,
  type TemplateCategory,
  type TextTemplate,
} from "@/engine/model/templates";
import { presetById, presetStyle } from "@/engine/model/text";
import { templateTexts, useLabel, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { addTemplate } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, HScroll, PanelHost, PanelShell } from "./controls";
import { previewCss } from "./TextPanel";

/** Card size in CSS pixels; the canvas is 1080 wide, so text is drawn at 1/~10 scale. */
const CARD_W = 104;
const CARD_H = (CARD_W * 16) / 9;
const K = CARD_W / 1080;

/** A layer's words in the app's language (the template's own English words if not translated). */
const layerText = (template: TextTemplate, i: number) => templateTexts(template.id)?.[i] ?? template.layers[i].text;

/** A tiny 9:16 picture of the template, every layer shown at once. */
function TemplateCard({
  template,
  lookPreset,
  selected,
  onPick,
}: {
  template: TextTemplate;
  lookPreset: string | null;
  selected: boolean;
  onPick: () => void;
}) {
  const t = useT();
  const L = useLabel();
  useLocale(); // The words below change with the language.
  const name = L("templateName", template.id, template.name);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className="group flex shrink-0 flex-col items-center gap-1.5 text-start"
      title={t("text.templates.showOnPreview", { name })}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded-lg border bg-[radial-gradient(ellipse_at_30%_20%,#3b3b44,#141418_70%)] transition-transform group-active:scale-95",
          selected ? "border-gold ring-2 ring-gold/60" : "border-white/10 group-hover:border-gold/60",
        )}
        style={{ width: CARD_W, height: CARD_H }}
      >
        {template.layers.map((layer, i) => {
          const preset = layerPreset(layer, lookPreset);
          const style = { ...presetStyle(presetById(preset)), ...(preset === layer.preset ? layer.style : {}) };
          const px = Math.max(4, style.fontSize * (layer.scale ?? 1) * K);
          return (
            <span
              key={i}
              className="absolute block text-center whitespace-pre-line"
              style={{
                left: (layer.x ?? 0.5) * CARD_W,
                top: (layer.y ?? 0.45) * CARD_H,
                maxWidth: (layer.maxWidth ?? 0.82) * CARD_W,
                width: "max-content",
                transform: `translate(-50%, -50%) rotate(${layer.rotation ?? 0}deg)`,
                textAlign: style.align,
                fontSize: px,
                lineHeight: style.lineHeight,
              }}
            >
              <span className="inline" style={{ ...previewCss(style, px), lineHeight: style.lineHeight, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
                {layerText(template, i)}
              </span>
            </span>
          );
        })}
        {selected && (
          <span className="absolute top-1 end-1 flex size-5 items-center justify-center rounded-full bg-gold text-neutral-950 shadow">
            <Check className="size-3" />
          </span>
        )}
      </span>
      <span
        className={cn("w-full truncate text-center text-[11px]", selected ? "font-medium text-gold-soft" : "text-neutral-300")}
        style={{ maxWidth: CARD_W }}
      >
        {name}
      </span>
    </button>
  );
}

/**
 * Ready-made, already-written text layouts in many looks. Tapping one shows it on the preview;
 * the check button in the panel header is what adds it at the playhead.
 */
export function TemplatesPanel() {
  const t = useT();
  const L = useLabel();
  useLocale(); // Search matches the words in the app's language.
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [look, setLook] = useState(TEMPLATE_LOOKS[0].id);
  const [query, setQuery] = useState("");
  const preview = useEditor((s) => s.templatePreview);
  const setTemplatePreview = useEditor((s) => s.setTemplatePreview);
  const lookPreset = TEMPLATE_LOOKS.find((l) => l.id === look)?.preset ?? null;

  const q = query.trim().toLowerCase();
  // Search finds a template by its name or words, in the app's language or in English.
  const matches = (tpl: TextTemplate) =>
    [tpl.name, L("templateName", tpl.id, tpl.name), ...tpl.layers.flatMap((l, i) => [l.text, layerText(tpl, i)])].some((s) =>
      s.toLowerCase().includes(q),
    );
  const shown = TEXT_TEMPLATES.filter((tpl) => (category === "all" || tpl.category === category) && (!q || matches(tpl)));

  /** Changing the look re-shows the browsed template in it. */
  const pickLook = (id: string) => {
    setLook(id);
    if (!preview) return;
    setTemplatePreview({ template: preview.template, lookPreset: TEMPLATE_LOOKS.find((l) => l.id === id)?.preset ?? null });
  };

  const surprise = () => {
    const pool = shown.length ? shown : TEXT_TEMPLATES;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const randomLook = TEMPLATE_LOOKS[Math.floor(Math.random() * TEMPLATE_LOOKS.length)];
    setLook(randomLook.id);
    setTemplatePreview({ template, lookPreset: randomLook.preset });
  };

  const host = useContext(PanelHost);
  /** The check button adds the browsed template; with nothing picked it just closes the panel. */
  const done = () => {
    const picked = useEditor.getState().templatePreview;
    if (picked) void addTemplate(picked.template, picked.lookPreset);
    else if (host.onClose) host.onClose();
    else useEditor.getState().openPanel(null);
  };

  const card = (tpl: TextTemplate) => (
    <TemplateCard
      key={tpl.id}
      template={tpl}
      lookPreset={lookPreset}
      selected={preview?.template.id === tpl.id}
      onPick={() => setTemplatePreview({ template: tpl, lookPreset })}
    />
  );
  // "All" with no search: a row per category you scroll sideways, like a store. Otherwise a grid.
  const rows = category === "all" && !q;

  return (
    <PanelShell title={t("text.templates.title")} onDone={done}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-neutral-400 focus-within:border-gold/60">
            <Search className="size-4 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("text.templates.search", { count: TEXT_TEMPLATES.length })}
              aria-label={t("text.templates.searchLabel")}
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />
          </label>
          <Chip onClick={surprise}>
            <Shuffle /> {t("text.templates.surprise")}
          </Chip>
        </div>

        <HScroll className="gap-1.5" label={t("text.templates.category")}>
          {[
            { id: "all" as const, label: t("text.templates.all") },
            ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, label: L("templateCategory", c.id, c.label) })),
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                category === c.id ? "bg-white text-neutral-950" : "bg-white/[0.06] text-neutral-300 hover:bg-white/10",
              )}
            >
              {c.label}
            </button>
          ))}
        </HScroll>

        <HScroll className="items-center gap-1.5" label={t("text.templates.look")}>
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-neutral-500">{t("text.templates.look")}</span>
          {TEMPLATE_LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={look === l.id}
              onClick={() => pickLook(l.id)}
              className={cn(
                "h-7 shrink-0 rounded-md border px-2.5 text-xs transition-colors",
                look === l.id ? "border-gold/70 bg-gold/10 text-white" : "border-white/[0.08] text-neutral-400 hover:text-neutral-200",
              )}
            >
              {L("look", l.id, l.label)}
            </button>
          ))}
        </HScroll>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">{t("text.templates.noMatch", { query })}</p>
        ) : rows ? (
          <div className="flex flex-col gap-4">
            {TEMPLATE_CATEGORIES.map((c) => (
              <section key={c.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-semibold text-neutral-200">{L("templateCategory", c.id, c.label)}</h3>
                  <button type="button" onClick={() => setCategory(c.id)} className="text-[11px] font-medium text-gold hover:underline">
                    {t("text.templates.seeAll")}
                  </button>
                </div>
                <HScroll className="gap-2 pb-1">{TEXT_TEMPLATES.filter((tpl) => tpl.category === c.id).map(card)}</HScroll>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid justify-between gap-x-2 gap-y-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)` }}>
            {shown.map(card)}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
