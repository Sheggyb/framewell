"use client";

import { Search, Shuffle } from "lucide-react";
import { useState } from "react";
import {
  layerPreset,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LOOKS,
  TEXT_TEMPLATES,
  type TemplateCategory,
  type TextTemplate,
} from "@/engine/model/templates";
import { presetById, presetStyle } from "@/engine/model/text";
import { cn } from "@/lib/utils";
import { addTemplate } from "@/store/actions";
import { Chip, PanelShell } from "./controls";
import { previewCss } from "./TextPanel";

/** Card size in CSS pixels; the canvas is 1080 wide, so text is drawn at 1/~10 scale. */
const CARD_W = 104;
const CARD_H = (CARD_W * 16) / 9;
const K = CARD_W / 1080;

/** A tiny 9:16 picture of the template, every layer shown at once. */
function TemplateCard({ template, lookPreset, onPick }: { template: TextTemplate; lookPreset: string | null; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex flex-col items-center gap-1.5 text-left"
      title={`Add "${template.name}"`}
    >
      <span
        className="relative block overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_30%_20%,#3b3b44,#141418_70%)] transition-transform group-active:scale-95 group-hover:border-gold/60"
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
                {layer.text}
              </span>
            </span>
          );
        })}
      </span>
      <span className="w-full truncate text-center text-[11px] text-neutral-300" style={{ maxWidth: CARD_W }}>
        {template.name}
      </span>
    </button>
  );
}

/** Ready-made, already-written text layouts in many looks. Tap one to add it at the playhead. */
export function TemplatesPanel() {
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [look, setLook] = useState(TEMPLATE_LOOKS[0].id);
  const [query, setQuery] = useState("");
  const lookPreset = TEMPLATE_LOOKS.find((l) => l.id === look)?.preset ?? null;

  const q = query.trim().toLowerCase();
  const shown = TEXT_TEMPLATES.filter(
    (t) =>
      (category === "all" || t.category === category) &&
      (!q || t.name.toLowerCase().includes(q) || t.layers.some((l) => l.text.toLowerCase().includes(q))),
  );

  const surprise = () => {
    const pool = shown.length ? shown : TEXT_TEMPLATES;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const randomLook = TEMPLATE_LOOKS[Math.floor(Math.random() * TEMPLATE_LOOKS.length)];
    void addTemplate(template, randomLook.preset);
  };

  return (
    <PanelShell title="Templates">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-neutral-400 focus-within:border-gold/60">
            <Search className="size-4 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${TEXT_TEMPLATES.length} templates`}
              aria-label="Search templates"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            />
          </label>
          <Chip onClick={surprise}>
            <Shuffle /> Surprise
          </Chip>
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Category">
          {[{ id: "all" as const, label: "All" }, ...TEMPLATE_CATEGORIES].map((c) => (
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
        </div>

        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Look">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Look</span>
          {TEMPLATE_LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={look === l.id}
              onClick={() => setLook(l.id)}
              className={cn(
                "h-7 shrink-0 rounded-md border px-2.5 text-xs transition-colors",
                look === l.id ? "border-gold/70 bg-gold/10 text-white" : "border-white/[0.08] text-neutral-400 hover:text-neutral-200",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">No templates match “{query}”.</p>
        ) : (
          <div className="grid justify-between gap-x-2 gap-y-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)` }}>
            {shown.map((t) => (
              <TemplateCard key={t.id} template={t} lookPreset={lookPreset} onPick={() => void addTemplate(t, lookPreset)} />
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

