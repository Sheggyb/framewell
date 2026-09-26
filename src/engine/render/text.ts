/**
 * Canvas 2D text rendering. Works on both HTMLCanvasElement and OffscreenCanvas
 * contexts so the same code drives preview and export.
 */
import type { TextClip } from "../model/project";
import type { TextStyle } from "../model/text";
import type { TextAnimState } from "../model/textAnimation";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Maps a font id (stored in the project) to a CSS font-family list. */
export type FontResolver = (fontId: string) => string;

export interface TextLayout {
  lines: string[];
  lineWidths: number[];
  lineHeight: number;
  blockWidth: number;
  blockHeight: number;
  /** Visual bounds including background padding and outline, before transform. */
  boxWidth: number;
  boxHeight: number;
}

export function fontString(style: TextStyle, family: string, size = style.fontSize): string {
  return `${style.italic ? "italic " : ""}${style.weight} ${size}px ${family}`;
}

function applyFont(ctx: Ctx2D, style: TextStyle, family: string) {
  ctx.font = fontString(style, family);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // Canvas letterSpacing is newer; skip it where unsupported.
  if ("letterSpacing" in ctx) {
    (ctx as { letterSpacing: string }).letterSpacing = `${style.letterSpacing * style.fontSize}px`;
  }
}

function wrap(ctx: Ctx2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export const displayText = (clip: TextClip) => (clip.style.uppercase ? clip.text.toUpperCase() : clip.text);

export function layoutText(ctx: Ctx2D, clip: TextClip, canvasWidth: number, fonts: FontResolver): TextLayout {
  const { style } = clip;
  applyFont(ctx, style, fonts(style.fontId));
  const lines = wrap(ctx, displayText(clip), clip.maxWidth * canvasWidth);
  const lineWidths = lines.map((l) => ctx.measureText(l).width);
  const lineHeight = style.fontSize * style.lineHeight;
  const blockWidth = Math.max(1, ...lineWidths);
  const blockHeight = lines.length * lineHeight;
  const pad = (style.bgColor ? style.bgPadding : 0) + style.strokeWidth;
  return { lines, lineWidths, lineHeight, blockWidth, blockHeight, boxWidth: blockWidth + pad * 2, boxHeight: blockHeight + pad * 2 };
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : hex;
}

/** Rotates a colour's hue. Greys (white/black) get a saturated colour instead so rainbow shows. */
function shiftHue(hex: string, degrees: number): string {
  const rgb = parseHex(hex);
  if (!rgb || degrees === 0) return hex;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (sat < 0.2) return `hsl(${degrees % 360}, 90%, 62%)`;
  return `hsl(${(h + degrees + 360) % 360}, ${Math.round(sat * 100)}%, ${Math.round(l * 100)}%)`;
}

function roundedRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** The part of each line currently revealed (typewriter / word-by-word / erase). */
function visibleLines(lines: string[], anim: TextAnimState): string[] {
  if (anim.reveal >= 1) return lines;
  if (anim.revealBy === "words") {
    const words = lines.map((l) => l.split(" ").filter(Boolean));
    let left = Math.round(words.flat().length * anim.reveal);
    return words.map((w) => {
      const shown = w.slice(0, Math.max(0, left));
      left -= w.length;
      return shown.join(" ");
    });
  }
  let left = Math.round(lines.reduce((n, l) => n + l.length, 0) * anim.reveal);
  return lines.map((line) => {
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length;
    return shown;
  });
}

const GLITCH_COLORS = ["#ff2050", "#00e5ff"];
/** The highlighted word pops slightly larger than the rest. */
const HIGHLIGHT_SCALE = 1.08;

/** Which word (line index, word index) is highlighted at this point of the clip. */
function highlightedWord(lines: string[], progress: number): [number, number] | null {
  const counts = lines.map((l) => l.split(" ").filter(Boolean).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let index = Math.min(total - 1, Math.floor(progress * total));
  for (let line = 0; line < counts.length; line++) {
    if (index < counts[line]) return [line, index];
    index -= counts[line];
  }
  return null;
}

export function drawText(
  ctx: Ctx2D,
  clip: TextClip,
  layout: TextLayout,
  anim: TextAnimState,
  canvasWidth: number,
  canvasHeight: number,
  fonts: FontResolver,
) {
  if (anim.opacity <= 0.001 || anim.reveal <= 0 || anim.wipeEnd <= anim.wipeStart) return;
  const { style, transform } = clip;
  const scale = transform.scale * anim.scale;
  const color = shiftHue(style.color, anim.hueShift);

  ctx.save();
  ctx.globalAlpha = Math.min(1, anim.opacity);
  ctx.translate(transform.x * canvasWidth + anim.dx * canvasHeight, transform.y * canvasHeight + anim.dy * canvasHeight);
  ctx.rotate(((transform.rotation + anim.rotation) * Math.PI) / 180);
  ctx.scale(scale * anim.scaleX, scale * anim.scaleY);
  applyFont(ctx, style, fonts(style.fontId));
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  if (anim.wipeStart > 0 || anim.wipeEnd < 1) {
    // Generous vertical margin so shadows and glows aren't cut off.
    const margin = style.fontSize * 2;
    ctx.beginPath();
    ctx.rect(
      -layout.boxWidth / 2 + layout.boxWidth * anim.wipeStart,
      -layout.boxHeight / 2 - margin,
      layout.boxWidth * (anim.wipeEnd - anim.wipeStart),
      layout.boxHeight + margin * 2,
    );
    ctx.clip();
  }

  // A glow pulse strengthens the shadow; with no shadow, it glows in the text colour.
  const shadowColor = style.shadowColor ?? (anim.glow > 1 ? color : null);
  const shadowBlur = (style.shadowColor ? style.shadowBlur : 12) * anim.glow;
  const shadow = () => {
    if (!shadowColor) return;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur * scale;
    ctx.shadowOffsetX = style.shadowX * scale;
    ctx.shadowOffsetY = style.shadowY * scale;
  };
  const noShadow = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const shown = visibleLines(layout.lines, anim);
  const top = -layout.blockHeight / 2;
  const highlight = clip.animation.highlight ? highlightedWord(layout.lines, anim.progress) : null;

  layout.lines.forEach((line, i) => {
    const visible = shown[i];
    if (!visible) return;
    const lineWidth = layout.lineWidths[i];
    const x =
      style.align === "left"
        ? -layout.blockWidth / 2
        : style.align === "right"
          ? layout.blockWidth / 2 - lineWidth
          : -lineWidth / 2;
    const y = top + layout.lineHeight * (i + 0.5);
    const visibleWidth = visible === line ? lineWidth : ctx.measureText(visible).width;

    if (style.bgColor) {
      const padX = style.bgPadding;
      const padY = style.bgPadding * 0.45;
      ctx.fillStyle = withAlpha(style.bgColor, style.bgOpacity);
      roundedRect(ctx, x - padX, y - layout.lineHeight / 2 - padY, visibleWidth + padX * 2, layout.lineHeight + padY * 2, style.bgRadius);
      ctx.fill();
    }

    // RGB split: offset red/cyan copies behind the text.
    if (anim.glitch > 0) {
      const offset = anim.glitch * style.fontSize * 0.07;
      GLITCH_COLORS.forEach((c, k) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = Math.min(1, anim.opacity) * 0.85;
        ctx.fillText(visible, x + (k === 0 ? -offset : offset), y);
      });
      ctx.globalAlpha = Math.min(1, anim.opacity);
    }

    // Outline first (carrying the shadow), then fill on top so the outline sits outside the letters.
    if (style.strokeWidth > 0) {
      shadow();
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * 2;
      ctx.strokeText(visible, x, y);
      noShadow();
    } else {
      shadow();
    }
    ctx.fillStyle = color;
    ctx.fillText(visible, x, y);
    noShadow();

    // Karaoke: redraw the current word in the highlight colour, slightly bigger.
    if (highlight && highlight[0] === i && clip.animation.highlight) {
      const words = line.split(" ").filter(Boolean);
      const word = words[highlight[1]];
      const before = words.slice(0, highlight[1]).join(" ");
      const wordX = x + (before ? ctx.measureText(`${before} `).width : 0);
      const offset = before ? before.length + 1 : 0;
      if (word && visible.length >= offset + word.length) {
        const w = ctx.measureText(word).width;
        ctx.save();
        ctx.translate(wordX + w / 2, y);
        ctx.scale(HIGHLIGHT_SCALE, HIGHLIGHT_SCALE);
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = style.strokeWidth * 2;
          ctx.strokeText(word, -w / 2, 0);
        }
        ctx.fillStyle = clip.animation.highlight;
        ctx.fillText(word, -w / 2, 0);
        ctx.restore();
      }
    }
  });

  ctx.restore();
}
