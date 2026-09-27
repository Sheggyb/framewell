"use client";

import {
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  ArrowDownToLine,
  ArrowUpToLine,
  Ban,
  Italic,
  Play,
  Shuffle,
  BookmarkPlus,
  X,
  RotateCcw,
  CaseUpper,
  AlignVerticalJustifyCenter,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { newId } from "@/engine/model/project";
import { deleteStyle, listStyles, saveStyle, type SavedStyle } from "@/lib/storage";
import { getTrack, projectDuration, retimeTextClip, trackEnd } from "@/engine/model/ops";
import type { TextClip } from "@/engine/model/project";
import {
  applyPreset,
  DEFAULT_TEXT,
  presetStyle,
  TEXT_PRESETS,
  type TextAlign,
  type TextInAnimation,
  type TextLoopAnimation,
  type TextOutAnimation,
  type TextPreset,
  type TextStyle,
} from "@/engine/model/text";
import { TEXT_IN_ANIMATIONS, TEXT_LOOP_ANIMATIONS, TEXT_OUT_ANIMATIONS } from "@/engine/model/textAnimation";
import { secondsToUs, usToSeconds } from "@/engine/model/time";
import { FONT_CATEGORIES, FONTS, fontFamilyFor, fontOption, type FontCategory } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Chip, PanelShell, Section, Slider, Tabs } from "./controls";
import { confirmDraftText, previewAnimation, updateProject, updateText } from "@/store/actions";
import { useEditor, type TextTool } from "@/store/editor";

const TOOL_TITLES: Record<TextTool, string> = {
  edit: "Text",
  style: "Styles",
  font: "Font",
  color: "Color",
  animate: "Animation",
};

const SWATCHES = [
  "#ffffff",
  "#000000",
  "#ffe600",
  "#ff9500",
  "#ff3b30",
  "#e11d48",
  "#ff2d95",
  "#af52de",
  "#0a84ff",
  "#32d7ff",
  "#34c759",
  "#8e8e93",
];

const WEIGHT_LABELS: Record<number, string> = { 400: "Regular", 600: "Semi", 700: "Bold", 800: "Extra", 900: "Black" };

const IN_LABELS: Record<TextInAnimation, string> = {
  none: "None",
  fade: "Fade",
  pop: "Pop",
  "slide-up": "Rise",
  "slide-down": "Drop",
  "from-left": "From left",
  "from-right": "From right",
  zoom: "Zoom in",
  grow: "Grow",
  bounce: "Bounce",
  elastic: "Elastic",
  spin: "Spin",
  flip: "Flip",
  stretch: "Stretch",
  swing: "Swing",
  wipe: "Wipe",
  typewriter: "Typewriter",
  words: "Word by word",
  glitch: "Glitch",
  flash: "Flash",
};
const OUT_LABELS: Record<TextOutAnimation, string> = {
  none: "None",
  fade: "Fade",
  pop: "Shrink",
  "slide-up": "Rise",
  "slide-down": "Sink",
  "to-left": "To left",
  "to-right": "To right",
  zoom: "Blow up",
  spin: "Spin",
  flip: "Flip",
  fall: "Fall",
  wipe: "Wipe",
  typewriter: "Erase",
  glitch: "Glitch",
};
const LOOP_LABELS: Record<TextLoopAnimation, string> = {
  none: "None",
  pulse: "Pulse",
  breathe: "Breathe",
  heartbeat: "Heartbeat",
  wiggle: "Wiggle",
  swing: "Swing",
  shake: "Shake",
  float: "Float",
  hop: "Hop",
  spin: "Spin",
  jelly: "Jelly",
  flicker: "Flicker",
  glow: "Glow",
  rainbow: "Rainbow",
  glitch: "Glitch",
};

const options = <T extends string>(values: readonly T[], labels: Record<T, string>): [T, string][] =>
  values.map((v) => [v, labels[v]]);

const IN_OPTIONS = options(TEXT_IN_ANIMATIONS, IN_LABELS);
const OUT_OPTIONS = options(TEXT_OUT_ANIMATIONS, OUT_LABELS);
const LOOP_OPTIONS = options(TEXT_LOOP_ANIMATIONS, LOOP_LABELS);

export function Swatches({
  value,
  onChange,
  allowNone,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowNone && (
        <button
          type="button"
          aria-label="None"
          onClick={() => onChange(null)}
          className={cn(
            "flex size-8 items-center justify-center rounded-full border-2 bg-neutral-800 text-neutral-400",
            value === null ? "border-gold" : "border-white/10",
          )}
        >
          <Ban className="size-4" />
        </button>
      )}
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className={cn(
            "size-8 rounded-full border-2",
            value?.toLowerCase() === color ? "border-gold ring-2 ring-gold/40" : "border-white/20",
          )}
          style={{ background: color }}
        />
      ))}
      <label
        className="relative size-8 cursor-pointer overflow-hidden rounded-full border-2 border-white/20"
        style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
        aria-label="Custom color"
      >
        <input
          type="color"
          value={value ?? "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/** CSS approximation of a text style, used for preset and font thumbnails. */
export function previewCss(style: TextStyle, px: number): React.CSSProperties {
  const k = px / style.fontSize;
  const shadows: string[] = [];
  if (style.shadowColor) {
    shadows.push(`${style.shadowX * k}px ${style.shadowY * k}px ${style.shadowBlur * k}px ${style.shadowColor}`);
  }
  return {
    fontFamily: fontFamilyFor(style.fontId),
    fontWeight: style.weight,
    fontStyle: style.italic ? "italic" : "normal",
    fontSize: px,
    textTransform: style.uppercase ? "uppercase" : "none",
    letterSpacing: `${style.letterSpacing}em`,
    color: style.color,
    WebkitTextStroke: style.strokeWidth ? `${Math.max(1, style.strokeWidth * 2 * k)}px ${style.strokeColor}` : undefined,
    paintOrder: "stroke fill",
    textShadow: shadows.join(", ") || undefined,
    background: style.bgColor ?? undefined,
    opacity: 1,
    borderRadius: style.bgColor ? style.bgRadius * k : undefined,
    padding: style.bgColor ? `${style.bgPadding * k * 0.45}px ${style.bgPadding * k}px` : undefined,
    lineHeight: 1.1,
  };
}

// ---------- tools ----------

function EditTool({ clip }: { clip: TextClip }) {
  const project = useEditor((s) => s.project);
  const main = getTrack(project, "main");
  // "Whole video" means the main track; for text-only projects, the whole timeline.
  const fullLength = (main && trackEnd(main)) || projectDuration(project);

  return (
    <div className="flex flex-col gap-4">
      {/* No autoFocus: the keyboard only comes up when the box is tapped. */}
      <textarea
        value={clip.text}
        rows={3}
        placeholder="Type something…"
        onChange={(e) => {
          const text = e.target.value;
          updateText(clip.id, "Edit text", (c) => {
            c.text = text;
          });
        }}
        // New text still says "Your text": select it so typing replaces it.
        onFocus={(e) => clip.text === DEFAULT_TEXT && e.currentTarget.select()}
        onBlur={() => useEditor.getState().commitLive()}
        // 16px+ stops iOS Safari from zooming the page on focus.
        className="w-full resize-none rounded-lg border border-white/10 bg-neutral-900 p-3 text-base text-white outline-none focus:border-gold/60"
      />
      <Section title="Timing">
        <Slider
          label="Duration"
          value={usToSeconds(clip.duration)}
          min={0.3}
          max={Math.max(15, usToSeconds(fullLength))}
          step={0.1}
          format={(v) => `${v.toFixed(1)}s`}
          onChange={(v) =>
            updateProject("Text duration", (d) => retimeTextClip(d, clip.id, clip.start, secondsToUs(v)))
          }
        />
        {fullLength > 0 && (
          <Chip
            onClick={() =>
              updateProject("Text full length", (d) => retimeTextClip(d, clip.id, 0, fullLength), "now")
            }
          >
            Show for the whole video
          </Chip>
        )}
      </Section>
    </div>
  );
}

/** "My styles": looks you saved, kept on this device and available in every project. */
function MyStyles({ clip }: { clip: TextClip }) {
  const [styles, setStyles] = useState<SavedStyle[] | null>(null);
  useEffect(() => {
    listStyles()
      .then(setStyles)
      .catch(() => setStyles([]));
  }, []);

  const saveCurrent = async () => {
    const name = clip.text.trim().slice(0, 24) || "My style";
    const saved: SavedStyle = {
      id: newId(),
      name,
      style: JSON.parse(JSON.stringify(clip.style)),
      animation: JSON.parse(JSON.stringify(clip.animation)),
      createdAt: Date.now(),
    };
    await saveStyle(saved);
    setStyles((list) => [saved, ...(list ?? [])]);
    useEditor.getState().showToast("Style saved to My styles");
  };

  const apply = (saved: SavedStyle) => {
    updateText(
      clip.id,
      `Style: ${saved.name}`,
      (c) => {
        c.style = JSON.parse(JSON.stringify(saved.style));
        c.animation = JSON.parse(JSON.stringify(saved.animation));
      },
      "now",
    );
    if (saved.animation.in !== "none") previewAnimation(clip.id, "in");
  };

  const remove = async (saved: SavedStyle) => {
    await deleteStyle(saved.id);
    setStyles((list) => list?.filter((s) => s.id !== saved.id) ?? null);
  };

  return (
    <Section title="My styles">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => void saveCurrent()}
          className="flex h-14 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-gold/40 px-3 text-xs font-medium text-gold hover:bg-gold/10"
        >
          <BookmarkPlus className="size-4" /> Save this look
        </button>
        {styles?.map((saved) => (
          <div key={saved.id} className="relative shrink-0">
            <button
              type="button"
              onClick={() => apply(saved)}
              className="flex h-14 max-w-40 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-3"
            >
              <span className="truncate" style={previewCss(saved.style, 16)}>
                {saved.name}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Remove ${saved.name}`}
              onClick={() => void remove(saved)}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-700 text-neutral-200 hover:bg-red-500"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function StyleTool({ clip }: { clip: TextClip }) {
  const [lastPick, setLastPick] = useState<string | null>(null);
  const pick = (preset: TextPreset) => {
    updateText(clip.id, `Style: ${preset.label}`, (c) => applyPreset(c, preset), "now");
    if (preset.animation?.in) previewAnimation(clip.id, "in");
    else if (preset.animation?.loop) previewAnimation(clip.id, "loop");
  };
  const surprise = () => {
    const others = TEXT_PRESETS.filter((p) => p.id !== lastPick);
    const preset = others[Math.floor(Math.random() * others.length)];
    setLastPick(preset.id);
    pick(preset);
  };
  return (
    <div className="flex flex-col gap-3">
      <MyStyles clip={clip} />
      <Chip onClick={surprise}>
        <Shuffle /> Surprise me
      </Chip>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => pick(preset)}
            className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-1 transition-colors hover:border-white/30"
          >
            <span className="max-w-full truncate" style={previewCss(presetStyle(preset), 20)}>
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FontTool({ clip }: { clip: TextClip }) {
  const { style } = clip;
  const font = fontOption(style.fontId);
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const set = (label: string, recipe: (c: TextClip) => void, commit: "now" | "later" = "now") =>
    updateText(clip.id, label, recipe, commit);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={category} onChange={setCategory} options={FONT_CATEGORIES} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {FONTS.filter((f) => category === "all" || f.category === category).map((f) => (
          <Chip
            key={f.id}
            active={f.id === style.fontId}
            onClick={() =>
              set(`Font: ${f.label}`, (c) => {
                c.style.fontId = f.id;
                // Pick the closest weight the new font really has.
                c.style.weight = f.weights.reduce((best, w) =>
                  Math.abs(w - style.weight) < Math.abs(best - style.weight) ? w : best,
                );
              })
            }
            className="h-11 px-1 text-sm"
            style={{ fontFamily: f.family }}
          >
            <span className="truncate">{f.label}</span>
          </Chip>
        ))}
      </div>

      <Section>
        <Slider label="Size" value={style.fontSize} min={24} max={300} onChange={(v) => set("Font size", (c) => void (c.style.fontSize = v), "later")} />
        {font.weights.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {font.weights.map((w) => (
              <Chip key={w} active={style.weight === w} onClick={() => set("Weight", (c) => void (c.style.weight = w))}>
                <span style={{ fontWeight: w }}>{WEIGHT_LABELS[w] ?? w}</span>
              </Chip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["left", <TextAlignStart key="l" />],
              ["center", <TextAlignCenter key="c" />],
              ["right", <TextAlignEnd key="r" />],
            ] as [TextAlign, ReactNode][]
          ).map(([align, icon]) => (
            <Chip key={align} active={style.align === align} onClick={() => set("Align", (c) => void (c.style.align = align))}>
              {icon}
            </Chip>
          ))}
          <Chip active={style.italic} onClick={() => set("Italic", (c) => void (c.style.italic = !style.italic))}>
            <Italic />
          </Chip>
          <Chip active={style.uppercase} onClick={() => set("Caps", (c) => void (c.style.uppercase = !style.uppercase))}>
            <CaseUpper />
          </Chip>
        </div>
      </Section>

      <Section title="Spacing">
        <Slider
          label="Letters"
          value={style.letterSpacing}
          min={-0.05}
          max={0.4}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => set("Letter spacing", (c) => void (c.style.letterSpacing = v), "later")}
        />
        <Slider
          label="Lines"
          value={style.lineHeight}
          min={0.8}
          max={2}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => set("Line height", (c) => void (c.style.lineHeight = v), "later")}
        />
        <Slider
          label="Wrap width"
          value={clip.maxWidth}
          min={0.3}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => set("Wrap width", (c) => void (c.maxWidth = v), "later")}
        />
      </Section>

      <Section title="Position">
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => set("Move to top", (c) => void Object.assign(c.transform, { x: 0.5, y: 0.2 }))}>
            <ArrowUpToLine /> Top
          </Chip>
          <Chip onClick={() => set("Move to middle", (c) => void Object.assign(c.transform, { x: 0.5, y: 0.5 }))}>
            <AlignVerticalJustifyCenter /> Middle
          </Chip>
          <Chip onClick={() => set("Move to bottom", (c) => void Object.assign(c.transform, { x: 0.5, y: 0.7 }))}>
            <ArrowDownToLine /> Bottom
          </Chip>
          <Chip onClick={() => set("Reset size", (c) => void Object.assign(c.transform, { scale: 1, rotation: 0 }))}>
            <RotateCcw /> Reset size
          </Chip>
        </div>
      </Section>
    </div>
  );
}

type ColorTarget = "text" | "outline" | "background" | "shadow";

function ColorTool({ clip }: { clip: TextClip }) {
  const [target, setTarget] = useState<ColorTarget>("text");
  const { style } = clip;
  const set = (label: string, recipe: (s: TextStyle) => void, commit: "now" | "later" = "now") =>
    updateText(clip.id, label, (c) => recipe(c.style), commit);

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={target}
        onChange={setTarget}
        options={[
          ["text", "Text"],
          ["outline", "Outline"],
          ["background", "Box"],
          ["shadow", "Shadow"],
        ]}
      />
      {target === "text" && <Swatches value={style.color} onChange={(c) => c && set("Text color", (s) => void (s.color = c))} />}
      {target === "outline" && (
        <>
          <Swatches
            value={style.strokeWidth > 0 ? style.strokeColor : null}
            allowNone
            onChange={(c) =>
              set("Outline", (s) => {
                if (c === null) s.strokeWidth = 0;
                else {
                  s.strokeColor = c;
                  if (s.strokeWidth === 0) s.strokeWidth = 6;
                }
              })
            }
          />
          <Slider label="Thickness" value={style.strokeWidth} min={0} max={24} onChange={(v) => set("Outline", (s) => void (s.strokeWidth = v), "later")} />
        </>
      )}
      {target === "background" && (
        <>
          <Swatches value={style.bgColor} allowNone onChange={(c) => set("Box color", (s) => void (s.bgColor = c))} />
          {style.bgColor && (
            <>
              <Slider
                label="Opacity"
                value={style.bgOpacity}
                min={0.1}
                max={1}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set("Box opacity", (s) => void (s.bgOpacity = v), "later")}
              />
              <Slider label="Roundness" value={style.bgRadius} min={0} max={60} onChange={(v) => set("Box roundness", (s) => void (s.bgRadius = v), "later")} />
              <Slider label="Padding" value={style.bgPadding} min={4} max={60} onChange={(v) => set("Box padding", (s) => void (s.bgPadding = v), "later")} />
            </>
          )}
        </>
      )}
      {target === "shadow" && (
        <>
          <Swatches
            value={style.shadowColor}
            allowNone
            onChange={(c) =>
              set("Shadow", (s) => {
                s.shadowColor = c;
                if (c && s.shadowBlur === 0 && s.shadowX === 0) s.shadowBlur = 16;
              })
            }
          />
          {style.shadowColor && (
            <>
              <Slider label="Blur / glow" value={style.shadowBlur} min={0} max={60} onChange={(v) => set("Shadow blur", (s) => void (s.shadowBlur = v), "later")} />
              <Slider
                label="Offset"
                value={style.shadowX}
                min={-30}
                max={30}
                onChange={(v) =>
                  set("Shadow offset", (s) => {
                    s.shadowX = v;
                    s.shadowY = v;
                  }, "later")
                }
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

type AnimPart = "in" | "loop" | "out";

function AnimateTool({ clip }: { clip: TextClip }) {
  const [part, setPart] = useState<AnimPart>("in");
  const a = clip.animation;
  const options = part === "in" ? IN_OPTIONS : part === "out" ? OUT_OPTIONS : LOOP_OPTIONS;
  const current = part === "in" ? a.in : part === "out" ? a.out : a.loop;

  const choose = (value: string) => {
    updateText(
      clip.id,
      "Animation",
      (c) => {
        if (part === "in") c.animation.in = value as TextInAnimation;
        else if (part === "out") c.animation.out = value as TextOutAnimation;
        else c.animation.loop = value as TextLoopAnimation;
      },
      "now",
    );
    if (value !== "none") previewAnimation(clip.id, part);
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={part}
        onChange={setPart}
        options={[
          ["in", "In"],
          ["loop", "Loop"],
          ["out", "Out"],
        ]}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {options.map(([value, label]) => (
          <Chip key={value} active={current === value} onClick={() => choose(value)}>
            {label}
          </Chip>
        ))}
      </div>
      {part !== "loop" && current !== "none" && (
        <Slider
          label="Speed"
          value={usToSeconds(part === "in" ? a.inDuration : a.outDuration)}
          min={0.1}
          max={2}
          step={0.05}
          format={(v) => `${v.toFixed(2)}s`}
          onChange={(v) =>
            updateText(clip.id, "Animation speed", (c) => {
              if (part === "in") c.animation.inDuration = secondsToUs(v);
              else c.animation.outDuration = secondsToUs(v);
            })
          }
        />
      )}
      {current !== "none" && (
        <Chip onClick={() => previewAnimation(clip.id, part)}>
          <Play /> Preview
        </Chip>
      )}
    </div>
  );
}

export function TextPanel({ clip }: { clip: TextClip }) {
  const panel = useEditor((s) => s.panel);
  const isDraft = useEditor((s) => s.draftText?.clipId === clip.id);
  if (!panel || !(panel in TOOL_TITLES)) return null;
  const tool = panel as TextTool;

  return (
    // For a draft text, the check button is "Add".
    <PanelShell title={TOOL_TITLES[tool]} onDone={isDraft ? confirmDraftText : undefined}>
      {tool === "edit" && <EditTool clip={clip} />}
      {tool === "style" && <StyleTool clip={clip} />}
      {tool === "font" && <FontTool clip={clip} />}
      {tool === "color" && <ColorTool clip={clip} />}
      {tool === "animate" && <AnimateTool clip={clip} />}
    </PanelShell>
  );
}
