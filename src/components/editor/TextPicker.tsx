"use client";

import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Blend,
  Check,
  ChevronsDown,
  Eraser,
  Eye,
  FoldVertical,
  Hammer,
  Feather,
  HeartPulse,
  Keyboard,
  Lightbulb,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  Orbit,
  PartyPopper,
  Rainbow,
  RotateCcw,
  RotateCw,
  Send,
  Shuffle,
  SlidersHorizontal,
  Sparkle,
  Sparkles,
  Tornado,
  Undo2,
  Vibrate,
  WholeWord,
  Wind,
  X,
  Zap,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { TextClip } from "@/engine/model/project";
import { applyPreset, presetStyle, TEXT_PRESETS, type TextInAnimation, type TextLoopAnimation, type TextOutAnimation, type TextStyle } from "@/engine/model/text";
import { useLabel, useT, type MessageKey } from "@/i18n";
import { FONT_CATEGORIES, FONTS, fontOption, type FontOption } from "@/lib/fonts";
import { previewAnimation, updateText } from "@/store/actions";
import { useEditor, type TextTool } from "@/store/editor";
import { IN_OPTIONS, LOOP_OPTIONS, OUT_OPTIONS, previewCss, SWATCHES, useAnimLabel, usePresetLabel } from "./TextPanel";
import { DialRow, KnobDial, PickerChips, ToolDial, type DialTool, type PickerChip } from "./ToolDial";

/** Text tools that the dial itself picks from (its full panel is behind "More"). */
const PICKERS: readonly TextTool[] = ["style", "font", "color", "size", "animate"];
export const isTextPicker = (panel: string | null): panel is TextTool => PICKERS.includes(panel as TextTool);

const SWATCH_NAMES: Record<string, MessageKey> = {
  "#ffffff": "text.color.swatches.white",
  "#000000": "text.color.swatches.black",
  "#ffe600": "text.color.swatches.yellow",
  "#ff9500": "text.color.swatches.orange",
  "#ff3b30": "text.color.swatches.red",
  "#e11d48": "text.color.swatches.crimson",
  "#ff2d95": "text.color.swatches.pink",
  "#af52de": "text.color.swatches.purple",
  "#0a84ff": "text.color.swatches.blue",
  "#32d7ff": "text.color.swatches.sky",
  "#34c759": "text.color.swatches.green",
  "#8e8e93": "text.color.swatches.grey",
};

const ANIMATION_ICONS: Record<string, LucideIcon> = {
  none: Ban,
  fade: Blend,
  pop: Zap,
  "slide-up": ArrowUp,
  "slide-down": ArrowDown,
  "from-left": ArrowRight,
  "to-right": ArrowRight,
  "from-right": ArrowLeft,
  "to-left": ArrowLeft,
  zoom: ZoomIn,
  grow: Maximize2,
  bounce: ArrowUpDown,
  hop: ArrowUpDown,
  elastic: Activity,
  wiggle: Activity,
  shake: Activity,
  spin: RotateCw,
  swing: Undo2,
  stretch: MoveHorizontal,
  flip: MoveHorizontal,
  wipe: Eraser,
  typewriter: Keyboard,
  words: WholeWord,
  glitch: Tornado,
  flash: Lightbulb,
  flicker: Lightbulb,
  fall: ChevronsDown,
  pulse: HeartPulse,
  heartbeat: HeartPulse,
  breathe: Wind,
  float: Feather,
  rainbow: Rainbow,
  slam: Hammer,
  drop: ChevronsDown,
  roll: RotateCcw,
  unfold: MoveVertical,
  shine: Sparkle,
  fly: Send,
  fold: FoldVertical,
  blink: Eye,
  tada: PartyPopper,
  orbit: Orbit,
  vibrate: Vibrate,
  strobe: Lightbulb,
};

const SIZES: [string, MessageKey, number][] = [
  ["S", "text.size.s", 56],
  ["M", "text.size.m", 84],
  ["L", "text.size.l", 120],
  ["XL", "text.size.xl", 180],
];

/** Any text style but the one showing now. */
function randomStyle(not: string | null): string {
  const others = TEXT_PRESETS.filter((p) => p.id !== not);
  return others[Math.floor(Math.random() * others.length)].id;
}

type ColorTarget = "text" | "outline" | "box" | "shadow";
type AnimPart = "in" | "loop" | "out";

const ANIM_UNDO: Record<AnimPart, MessageKey> = {
  in: "text.undo.animationIn",
  loop: "text.undo.animationLoop",
  out: "text.undo.animationOut",
};

const swatch = (color: string | null) =>
  color === null ? <Ban /> : <span className="block size-full rounded-full ring-1 ring-white/30" style={{ background: color }} />;

/** A value the user can see in the dial: "Aa" drawn in a font or text style. */
const sample = (style: React.CSSProperties) => (
  <span className="rounded-[3px] px-0.5" style={{ ...style, fontSize: "0.9em", lineHeight: 1.1 }}>
    Aa
  </span>
);

/**
 * A text tool as a picker on the dial: its choices ride the arc and each one is tried on the
 * video as it reaches the ring. Chips above jump between groups or switch what is changed, and
 * "More" opens the tool's full panel. Cancel takes back everything tried since it opened.
 */
export function TextPicker({ clip, tool, isDesktop }: { clip: TextClip; tool: TextTool; isDesktop: boolean }) {
  const t = useT();
  const L = useLabel();
  const animLabel = useAnimLabel();
  const presetLabel = usePresetLabel();
  const moreOpen = useEditor((s) => s.moreOpen);
  const [colorTarget, setColorTarget] = useState<ColorTarget>("text");
  const [animPart, setAnimPart] = useState<AnimPart>("in");
  const [pickedStyle, setPickedStyle] = useState<string | null>(null);
  // The look when the picker opened: a custom colour stays on the dial while you try others.
  const [opened] = useState(() => clip.style);
  const style = clip.style;

  // Picks are one live edit per kind of change: the dial can try many, and the last one stays.
  const set = (label: string, recipe: (c: TextClip) => void) => updateText(clip.id, label, recipe, "manual");

  const close = () => useEditor.getState().openPanel(null);
  const cancel: DialTool = {
    id: "picker-cancel",
    label: t("common.cancel"),
    icon: <X />,
    onSelect: () => {
      useEditor.getState().revertPanel();
      close();
    },
  };
  const done: DialTool = { id: "picker-done", label: t("common.done"), icon: <Check />, hint: "Esc", onSelect: close };
  const more: PickerChip[] = isDesktop
    ? []
    : [
        {
          id: "more",
          label: (
            <>
              <SlidersHorizontal /> {t("text.picker.more")}
            </>
          ),
          active: moreOpen,
          onSelect: () => useEditor.getState().setMoreOpen(!moreOpen),
        },
      ];

  let chips: PickerChip[] = [];
  let dial: ReactNode;

  if (tool === "font") {
    const setFont = (f: FontOption) =>
      set(t("text.undo.font"), (c) => {
        c.style.fontId = f.id;
        // Keep the weight closest to the one the text had.
        const weight = c.style.weight;
        c.style.weight = f.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best));
      });
    const current = fontOption(style.fontId);
    chips = FONT_CATEGORIES.filter(([c]) => c !== "all").map(([category, label]) => ({
      id: category,
      label: L("fontCategory", category, label),
      active: current.category === category,
      onSelect: () => setFont(FONTS.find((f) => f.category === category)!),
    }));
    const tools = FONTS.map((f) => ({
      id: f.id,
      label: f.label,
      icon: sample({ fontFamily: f.family, fontWeight: f.weights.at(-1) }),
      active: f.id === style.fontId,
      onSelect: () => setFont(f),
    }));
    dial = <ToolDial label={t("text.picker.fonts")} tools={tools} home={current.id} remember={false} onFocus={(t) => t.onSelect()} />;
  } else if (tool === "color") {
    const colorOf = (s: TextStyle): string | null =>
      ({
        text: s.color,
        outline: s.strokeWidth > 0 ? s.strokeColor : null,
        box: s.bgColor,
        shadow: s.shadowColor,
      })[colorTarget];
    const current = colorOf(style);
    const custom = colorOf(opened);
    const apply = (color: string | null) => {
      const recipes: Record<ColorTarget, [string, (s: TextStyle) => void]> = {
        text: [t("text.undo.textColor"), (s) => void (s.color = color ?? s.color)],
        outline: [
          t("text.undo.outline"),
          (s) => {
            if (color === null) s.strokeWidth = 0;
            else {
              s.strokeColor = color;
              if (s.strokeWidth === 0) s.strokeWidth = 6;
            }
          },
        ],
        box: [t("text.undo.boxColor"), (s) => void (s.bgColor = color)],
        shadow: [
          t("text.undo.shadow"),
          (s) => {
            s.shadowColor = color;
            if (color && s.shadowBlur === 0 && s.shadowX === 0) s.shadowBlur = 16;
          },
        ],
      };
      const [label, recipe] = recipes[colorTarget];
      set(label, (c) => recipe(c.style));
    };
    const colors: (string | null)[] = [
      ...(colorTarget === "text" ? [] : [null]),
      ...(custom && !SWATCHES.includes(custom.toLowerCase()) ? [custom] : []),
      ...SWATCHES,
    ];
    chips = (
      [
        ["text", t("text.color.text")],
        ["outline", t("text.color.outline")],
        ["box", t("text.color.box")],
        ["shadow", t("text.color.shadow")],
      ] as [ColorTarget, string][]
    ).map(([target, label]) => ({ id: target, label, active: colorTarget === target, onSelect: () => setColorTarget(target) }));
    const tools = colors.map((color) => ({
      id: `${colorTarget}:${color ?? "none"}`,
      label: color === null ? t("text.color.none") : t(SWATCH_NAMES[color.toLowerCase()] ?? "text.color.custom"),
      icon: swatch(color),
      active: (current?.toLowerCase() ?? null) === (color?.toLowerCase() ?? null),
      onSelect: () => apply(color),
    }));
    dial = (
      <ToolDial
        label={t("text.picker.colors")}
        tools={tools}
        home={tools.find((t) => t.active)?.id ?? tools[0].id}
        remember={false}
        onFocus={(t) => t.onSelect()}
      />
    );
  } else if (tool === "style") {
    const pick = (id: string) => {
      const preset = TEXT_PRESETS.find((p) => p.id === id)!;
      setPickedStyle(id);
      set(t("text.undo.style"), (c) => applyPreset(c, preset));
    };
    const play = (id: string) => {
      const preset = TEXT_PRESETS.find((p) => p.id === id);
      if (preset?.animation?.in) previewAnimation(clip.id, "in");
      else if (preset?.animation?.loop) previewAnimation(clip.id, "loop");
    };
    chips = [
      {
        id: "surprise",
        label: (
          <>
            <Shuffle /> {t("text.style.surpriseMe")}
          </>
        ),
        onSelect: () => {
          const id = randomStyle(pickedStyle);
          pick(id);
          play(id);
        },
      },
    ];
    const tools = TEXT_PRESETS.map((p) => ({
      id: p.id,
      label: presetLabel(p),
      icon: sample(previewCss(presetStyle(p), 15)),
      active: p.id === pickedStyle,
      onSelect: () => {
        pick(p.id);
        play(p.id);
      },
    }));
    dial = (
      <ToolDial
        label={t("text.picker.styles")}
        tools={tools}
        home={pickedStyle ?? TEXT_PRESETS[0].id}
        onFocus={(t, settled) => {
          pick(t.id);
          if (settled) play(t.id);
        }}
      />
    );
  } else if (tool === "animate") {
    const a = clip.animation;
    const options = animPart === "in" ? IN_OPTIONS : animPart === "out" ? OUT_OPTIONS : LOOP_OPTIONS;
    const current = animPart === "in" ? a.in : animPart === "out" ? a.out : a.loop;
    const choose = (value: string) =>
      set(t(ANIM_UNDO[animPart]), (c) => {
        if (animPart === "in") c.animation.in = value as TextInAnimation;
        else if (animPart === "out") c.animation.out = value as TextOutAnimation;
        else c.animation.loop = value as TextLoopAnimation;
      });
    const play = (value: string) => value !== "none" && previewAnimation(clip.id, animPart);
    chips = (
      [
        ["in", t("text.animate.in")],
        ["loop", t("text.animate.loop")],
        ["out", t("text.animate.out")],
      ] as [AnimPart, string][]
    ).map(([part, label]) => ({ id: part, label, active: animPart === part, onSelect: () => setAnimPart(part) }));
    const tools = options.map(([value, label]) => {
      const Icon = ANIMATION_ICONS[value] ?? Sparkles;
      return {
        id: `${animPart}:${value}`,
        label: animLabel(animPart, value, label),
        icon: <Icon />,
        active: value === current,
        onSelect: () => {
          choose(value);
          play(value);
        },
      };
    });
    dial = (
      <ToolDial
        label={t("text.picker.animations")}
        tools={tools}
        home={`${animPart}:${current}`}
        remember={false}
        onFocus={(t, settled) => {
          const value = t.id.slice(t.id.indexOf(":") + 1);
          choose(value);
          if (settled) play(value);
        }}
      />
    );
  } else if (tool === "size") {
    const setSize = (v: number) => set(t("text.undo.fontSize"), (c) => void (c.style.fontSize = v));
    chips = SIZES.map(([id, label, v]) => ({ id, label: t(label), active: style.fontSize === v, onSelect: () => setSize(v) }));
    dial = <KnobDial label={t("text.picker.size")} value={style.fontSize} min={24} max={300} step={2} onChange={(v) => setSize(v)} />;
  }

  return (
    <>
      {/* Left to right in every language, like the tool dial. */}
      <div dir="ltr" className="contents">
        <PickerChips chips={[...chips, ...more]} />
        <DialRow leading={cancel} trailing={done} trailingTone="confirm">
          {dial}
        </DialRow>
      </div>
    </>
  );
}
