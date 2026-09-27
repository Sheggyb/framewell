import { newId, type TextClip } from "./project";
import type { TextInAnimation, TextLoopAnimation, TextOutAnimation } from "./textAnimation";
import { secondsToUs, type Micros } from "./time";

export type TextAlign = "left" | "center" | "right";

/** All sizes are in project-canvas pixels (e.g. 1080 wide for 9:16). */
export interface TextStyle {
  fontId: string;
  fontSize: number;
  weight: number;
  italic: boolean;
  uppercase: boolean;
  align: TextAlign;
  /** Extra space between letters, in em. */
  letterSpacing: number;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  color: string;
  strokeColor: string;
  /** 0 disables the outline. */
  strokeWidth: number;
  /** null disables the background box. */
  bgColor: string | null;
  bgOpacity: number;
  bgRadius: number;
  bgPadding: number;
  /** null disables the shadow. Zero offset + blur gives a glow. */
  shadowColor: string | null;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
}

/** Position is the text centre as a fraction of the canvas (0–1). Rotation in degrees. */
export interface TextTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export type { TextInAnimation, TextLoopAnimation, TextOutAnimation } from "./textAnimation";

export interface TextAnimation {
  in: TextInAnimation;
  inDuration: Micros;
  out: TextOutAnimation;
  outDuration: Micros;
  loop: TextLoopAnimation;
  /** Karaoke-style word highlight colour (the spoken word lights up), or null. */
  highlight: string | null;
}

export interface TextPreset {
  id: string;
  label: string;
  style: Partial<TextStyle>;
  animation?: Partial<TextAnimation>;
}

export const DEFAULT_TEXT_DURATION = secondsToUs(3);

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontId: "montserrat",
  fontSize: 96,
  weight: 800,
  italic: false,
  uppercase: false,
  align: "center",
  letterSpacing: 0,
  lineHeight: 1.2,
  color: "#ffffff",
  strokeColor: "#000000",
  strokeWidth: 6,
  bgColor: null,
  bgOpacity: 1,
  bgRadius: 18,
  bgPadding: 22,
  shadowColor: null,
  shadowBlur: 0,
  shadowX: 0,
  shadowY: 0,
};

export const DEFAULT_TEXT_ANIMATION: TextAnimation = {
  in: "none",
  inDuration: secondsToUs(0.4),
  out: "none",
  outDuration: secondsToUs(0.3),
  loop: "none",
  highlight: null,
};

const noStroke = { strokeWidth: 0 };

export const TEXT_PRESETS: TextPreset[] = [
  { id: "classic", label: "Classic", style: {} },
  {
    id: "box-light",
    label: "Box",
    style: { ...noStroke, fontSize: 84, weight: 700, color: "#000000", bgColor: "#ffffff" },
  },
  {
    id: "box-dark",
    label: "Dark box",
    style: { ...noStroke, fontSize: 84, weight: 700, bgColor: "#000000", bgOpacity: 0.7 },
  },
  {
    id: "yellow",
    label: "Yellow pop",
    style: { fontId: "anton", fontSize: 128, weight: 400, uppercase: true, color: "#ffe600", strokeWidth: 9 },
    animation: { in: "pop" },
  },
  {
    id: "neon",
    label: "Neon",
    style: { ...noStroke, fontId: "righteous", fontSize: 110, weight: 400, shadowColor: "#ff2bd6", shadowBlur: 40 },
    animation: { loop: "flicker" },
  },
  {
    id: "retro",
    label: "Retro",
    style: {
      ...noStroke,
      fontId: "bangers",
      fontSize: 130,
      weight: 400,
      letterSpacing: 0.04,
      color: "#ffd23f",
      shadowColor: "#e63946",
      shadowX: 8,
      shadowY: 8,
    },
    animation: { in: "bounce" },
  },
  {
    id: "subtitle",
    label: "Subtitle",
    style: { ...noStroke, fontId: "poppins", fontSize: 60, weight: 600, shadowColor: "#000000", shadowBlur: 12 },
  },
  {
    id: "headline",
    label: "Headline",
    style: { ...noStroke, fontId: "bebas", fontSize: 170, weight: 400, uppercase: true, letterSpacing: 0.04, shadowColor: "#000000", shadowBlur: 20 },
    animation: { in: "slide-up" },
  },
  {
    id: "red-alert",
    label: "Breaking",
    style: { ...noStroke, fontId: "anton", fontSize: 100, weight: 400, uppercase: true, bgColor: "#e11d48", bgRadius: 6 },
    animation: { in: "zoom" },
  },
  {
    id: "typewriter",
    label: "Typewriter",
    style: { ...noStroke, fontId: "spacemono", fontSize: 64, weight: 700, bgColor: "#000000", bgOpacity: 0.85, bgRadius: 4 },
    animation: { in: "typewriter", inDuration: secondsToUs(1.2) },
  },
  {
    id: "script",
    label: "Script",
    style: { fontId: "pacifico", fontSize: 110, weight: 400, color: "#ff7eb6", strokeColor: "#ffffff", strokeWidth: 5 },
    animation: { in: "fade" },
  },
  {
    id: "marker",
    label: "Marker",
    style: { ...noStroke, fontId: "marker", fontSize: 100, weight: 400, color: "#111111", bgColor: "#ffe600", bgRadius: 4 },
  },
  {
    id: "handwritten",
    label: "Note",
    style: { ...noStroke, fontId: "caveat", fontSize: 120, weight: 700, shadowColor: "#000000", shadowBlur: 10, shadowY: 4 },
    animation: { loop: "float" },
  },
  {
    id: "elegant",
    label: "Elegant",
    style: { ...noStroke, fontId: "playfair", fontSize: 104, weight: 600, italic: true, shadowColor: "#000000", shadowBlur: 16 },
    animation: { in: "fade", inDuration: secondsToUs(0.8) },
  },
  {
    id: "words",
    label: "Word by word",
    style: { fontId: "archivo", fontSize: 104, weight: 400, uppercase: true, strokeWidth: 8 },
    animation: { in: "words", inDuration: secondsToUs(1.2) },
  },
  {
    id: "bubble",
    label: "Bubble",
    style: { fontId: "titan", fontSize: 116, weight: 400, strokeWidth: 9, shadowColor: "#000000", shadowY: 8 },
    animation: { in: "elastic", inDuration: secondsToUs(0.7) },
  },
  {
    id: "comic",
    label: "Comic",
    style: {
      fontId: "luckiest",
      fontSize: 120,
      weight: 400,
      color: "#ffd400",
      strokeWidth: 10,
      shadowColor: "#000000",
      shadowX: 7,
      shadowY: 7,
    },
    animation: { in: "stretch" },
  },
  {
    id: "sticker",
    label: "Sticker",
    style: { ...noStroke, fontId: "rubik", fontSize: 88, weight: 900, color: "#111111", bgColor: "#ffffff", bgRadius: 60, bgPadding: 30 },
    animation: { in: "elastic", inDuration: secondsToUs(0.6), loop: "wiggle" },
  },
  {
    id: "news",
    label: "News",
    style: { ...noStroke, fontId: "barlow", fontSize: 96, weight: 900, uppercase: true, bgColor: "#111111", bgOpacity: 0.9, bgRadius: 2 },
    animation: { in: "wipe", inDuration: secondsToUs(0.5), out: "wipe" },
  },
  {
    id: "minimal",
    label: "Minimal",
    style: { ...noStroke, fontId: "inter", fontSize: 72, weight: 600, shadowColor: "#000000", shadowBlur: 18 },
    animation: { in: "slide-up", out: "fade" },
  },
  {
    id: "gamer",
    label: "Gamer",
    style: { ...noStroke, fontId: "pressstart", fontSize: 58, weight: 400, color: "#39ff14", shadowColor: "#39ff14", shadowBlur: 24 },
    animation: { in: "glitch", inDuration: secondsToUs(0.6), loop: "glitch" },
  },
  {
    id: "retro80s",
    label: "80s",
    style: { ...noStroke, fontId: "monoton", fontSize: 120, weight: 400, color: "#ff4fd8", shadowColor: "#ff4fd8", shadowBlur: 32 },
    animation: { in: "flash", inDuration: secondsToUs(0.6), loop: "glow" },
  },
  {
    id: "rainbow",
    label: "Rainbow",
    style: { fontId: "bungee", fontSize: 104, weight: 400, strokeWidth: 7 },
    animation: { in: "pop", loop: "rainbow" },
  },
  {
    id: "horror",
    label: "Horror",
    style: { ...noStroke, fontId: "creepster", fontSize: 140, weight: 400, color: "#e11d2e", shadowColor: "#000000", shadowBlur: 24 },
    animation: { in: "fade", inDuration: secondsToUs(0.8), loop: "shake" },
  },
  {
    id: "luxury",
    label: "Luxury",
    style: { ...noStroke, fontId: "greatvibes", fontSize: 140, weight: 400, color: "#f5c542", shadowColor: "#f5c542", shadowBlur: 14 },
    animation: { in: "fade", inDuration: secondsToUs(1), loop: "glow" },
  },
  {
    id: "stamp",
    label: "Stamp",
    style: { ...noStroke, fontId: "blackops", fontSize: 100, weight: 400, uppercase: true, bgColor: "#d90429", bgRadius: 4 },
    animation: { in: "zoom", inDuration: secondsToUs(0.3), loop: "heartbeat" },
  },
  {
    id: "soft",
    label: "Soft",
    style: { fontId: "fredoka", fontSize: 108, weight: 700, color: "#ffd6e8", strokeColor: "#ff5fa2", strokeWidth: 7 },
    animation: { in: "bounce", loop: "float" },
  },
  {
    id: "glow-up",
    label: "Glow up",
    style: { ...noStroke, fontId: "syne", fontSize: 110, weight: 800, shadowColor: "#7c5cff", shadowBlur: 36 },
    animation: { in: "shine", inDuration: secondsToUs(0.7), loop: "glow" },
  },
  {
    id: "slam",
    label: "Slam",
    style: { fontId: "anton", fontSize: 150, weight: 400, uppercase: true, strokeWidth: 8 },
    animation: { in: "slam", inDuration: secondsToUs(0.45) },
  },
  {
    id: "pastel",
    label: "Pastel",
    style: { ...noStroke, fontId: "fredoka", fontSize: 96, weight: 700, color: "#2b2d42", bgColor: "#ffd6a5", bgRadius: 30 },
    animation: { in: "pop", loop: "breathe" },
  },
  {
    id: "vlog",
    label: "Vlog",
    style: { ...noStroke, fontId: "caveat", fontSize: 124, weight: 700, shadowColor: "#000000", shadowBlur: 10 },
    animation: { in: "words", inDuration: secondsToUs(0.8) },
  },
  {
    id: "cyber",
    label: "Cyber",
    style: { ...noStroke, fontId: "pressstart", fontSize: 64, weight: 400, color: "#39ff14", shadowColor: "#39ff14", shadowBlur: 20 },
    animation: { in: "glitch", inDuration: secondsToUs(0.5), loop: "flicker" },
  },
  {
    id: "sale",
    label: "Sale",
    style: { ...noStroke, fontId: "bungee", fontSize: 116, weight: 400, color: "#ffe600", bgColor: "#000000", bgRadius: 8 },
    animation: { in: "slam", inDuration: secondsToUs(0.4), loop: "pulse" },
  },
  {
    id: "love",
    label: "Love",
    style: { fontId: "pacifico", fontSize: 120, weight: 400, color: "#ff5fa2", strokeColor: "#ffffff", strokeWidth: 6 },
    animation: { in: "pop", loop: "heartbeat" },
  },
  {
    id: "chill",
    label: "Chill",
    style: { ...noStroke, fontId: "poppins", fontSize: 80, weight: 600, bgColor: "#000000", bgOpacity: 0.45, bgRadius: 40 },
    animation: { in: "fade", inDuration: secondsToUs(0.6), loop: "float" },
  },
  {
    id: "boss",
    label: "Boss",
    style: { fontId: "abril", fontSize: 128, weight: 400, color: "#f5c542", strokeWidth: 5 },
    animation: { in: "drop", inDuration: secondsToUs(0.6) },
  },
  {
    id: "party",
    label: "Party",
    style: { fontId: "luckiest", fontSize: 128, weight: 400, strokeColor: "#7b2ff7", strokeWidth: 8 },
    animation: { in: "unfold", inDuration: secondsToUs(0.6), loop: "tada" },
  },
  {
    id: "dreamy",
    label: "Dreamy",
    style: { ...noStroke, fontId: "satisfy", fontSize: 130, weight: 400, color: "#e0d4ff", shadowColor: "#a78bfa", shadowBlur: 30 },
    animation: { in: "shine", inDuration: secondsToUs(0.8), loop: "orbit" },
  },
];

/** Caption looks: readable at the bottom of the frame, with the current word highlighted. */
export const CAPTION_PRESETS: TextPreset[] = [
  {
    id: "cap-bold",
    label: "Bold",
    style: { fontId: "montserrat", fontSize: 76, weight: 900, uppercase: true, strokeWidth: 8 },
    animation: { highlight: "#ffe600" },
  },
  {
    id: "cap-box",
    label: "Box",
    style: { fontId: "inter", fontSize: 64, weight: 800, strokeWidth: 0, bgColor: "#000000", bgOpacity: 0.75, bgRadius: 14 },
    animation: { highlight: "#34c759" },
  },
  {
    id: "cap-pop",
    label: "Pop",
    style: { fontId: "luckiest", fontSize: 84, weight: 400, uppercase: true, strokeWidth: 9 },
    animation: { highlight: "#ff2d95", in: "pop", inDuration: 150_000 },
  },
  {
    id: "cap-clean",
    label: "Clean",
    style: { fontId: "poppins", fontSize: 62, weight: 600, strokeWidth: 0, shadowColor: "#000000", shadowBlur: 14 },
    animation: { highlight: "#32d7ff" },
  },
  {
    id: "cap-yellow",
    label: "Yellow",
    style: { fontId: "anton", fontSize: 92, weight: 400, uppercase: true, color: "#ffe600", strokeWidth: 9 },
    animation: { highlight: "#ffffff" },
  },
  {
    id: "cap-plain",
    label: "Plain",
    style: { fontId: "roboto", fontSize: 58, weight: 700, strokeWidth: 0, bgColor: "#000000", bgOpacity: 0.6, bgRadius: 8 },
  },
];

/** Looks used by the Stickers panel (emoji and creator labels). Not shown in the Styles grid. */
export const STICKER_PRESETS: TextPreset[] = [
  {
    id: "emoji",
    label: "Emoji",
    style: { fontId: "emoji", fontSize: 220, weight: 400, strokeWidth: 0, lineHeight: 1.1 },
    animation: { in: "pop" },
  },
  {
    id: "label-white",
    label: "White label",
    style: { fontId: "rubik", fontSize: 72, weight: 900, uppercase: true, color: "#111111", strokeWidth: 0, bgColor: "#ffffff", bgRadius: 60, bgPadding: 30 },
    animation: { in: "elastic", inDuration: 600_000 },
  },
  {
    id: "label-red",
    label: "Red label",
    style: { fontId: "anton", fontSize: 84, weight: 400, uppercase: true, strokeWidth: 0, bgColor: "#e11d48", bgRadius: 10 },
    animation: { in: "pop", loop: "pulse" },
  },
  {
    id: "label-yellow",
    label: "Yellow label",
    style: { fontId: "archivo", fontSize: 70, weight: 400, uppercase: true, color: "#111111", strokeWidth: 0, bgColor: "#ffe600", bgRadius: 8 },
    animation: { in: "stretch" },
  },
  {
    id: "label-black",
    label: "Black label",
    style: { fontId: "montserrat", fontSize: 70, weight: 900, uppercase: true, strokeWidth: 0, bgColor: "#000000", bgOpacity: 0.85, bgRadius: 60, bgPadding: 30 },
    animation: { in: "slide-up", loop: "float" },
  },
];

const ALL_PRESETS = [...TEXT_PRESETS, ...CAPTION_PRESETS, ...STICKER_PRESETS];

export const presetById = (id: string): TextPreset => ALL_PRESETS.find((p) => p.id === id) ?? TEXT_PRESETS[0];

export function presetStyle(preset: TextPreset): TextStyle {
  return { ...DEFAULT_TEXT_STYLE, ...preset.style };
}

/** Replaces the clip's look with the preset. Position, timing and text are kept. */
export function applyPreset(clip: TextClip, preset: TextPreset): void {
  clip.style = presetStyle(preset);
  clip.animation = { ...DEFAULT_TEXT_ANIMATION, ...preset.animation };
}

/** What a new text says until it is typed over. */
export const DEFAULT_TEXT = "Your text";

export function createTextClip(start: Micros, duration: Micros = DEFAULT_TEXT_DURATION, presetId = "classic"): TextClip {
  const preset = presetById(presetId);
  return {
    id: newId(),
    type: "text",
    start,
    duration,
    text: DEFAULT_TEXT,
    style: presetStyle(preset),
    transform: { x: 0.5, y: 0.45, scale: 1, rotation: 0 },
    animation: { ...DEFAULT_TEXT_ANIMATION, ...preset.animation },
    maxWidth: 0.82,
  };
}
