/**
 * Colour looks for media clips: a filter preset (with intensity) plus manual adjustments.
 * Everything is 0 = unchanged, so an untouched clip skips the colour pass entirely.
 */

export interface ColorAdjust {
  /** −1…1: stops of light, roughly. */
  exposure: number;
  contrast: number;
  saturation: number;
  /** −1 cool … 1 warm. */
  warmth: number;
  /** −1 green … 1 magenta. */
  tint: number;
  /** 0…1: lifted, matte blacks. */
  fade: number;
  /** 0…1: darker corners. */
  vignette: number;
  /** 0…1: film grain. */
  grain: number;
}

export type Rgb = [number, number, number];

export interface FilterPreset {
  id: string;
  label: string;
  adjust: Partial<ColorAdjust>;
  /** Split toning: colour pushed into shadows and highlights (−1…1 per channel). */
  shadows?: Rgb;
  highlights?: Rgb;
  /** Swatch colour for the filter button. */
  swatch: string;
}

export interface ClipColor {
  filter: string | null;
  /** 0…1: how strongly the filter applies. */
  intensity: number;
  adjust: ColorAdjust;
}

export const NEUTRAL_ADJUST: ColorAdjust = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  tint: 0,
  fade: 0,
  vignette: 0,
  grain: 0,
};

export const DEFAULT_CLIP_COLOR: ClipColor = { filter: null, intensity: 1, adjust: { ...NEUTRAL_ADJUST } };

export const FILTERS: FilterPreset[] = [
  { id: "vivid", label: "Vivid", adjust: { saturation: 0.35, contrast: 0.15 }, swatch: "#e0773c" },
  { id: "warm", label: "Warm", adjust: { warmth: 0.45, saturation: 0.1 }, swatch: "#d9a05b" },
  { id: "golden", label: "Golden hour", adjust: { warmth: 0.6, exposure: 0.08, fade: 0.1 }, highlights: [0.12, 0.06, -0.08], swatch: "#e6b865" },
  { id: "cool", label: "Cool", adjust: { warmth: -0.45 }, swatch: "#6f9fc9" },
  {
    id: "teal-orange",
    label: "Cinema",
    adjust: { contrast: 0.2, saturation: 0.1 },
    shadows: [-0.1, 0.05, 0.12],
    highlights: [0.12, 0.04, -0.08],
    swatch: "#3f8a8f",
  },
  { id: "film", label: "Film", adjust: { contrast: 0.1, fade: 0.25, grain: 0.35, saturation: -0.1 }, swatch: "#b3a17e" },
  { id: "matte", label: "Matte", adjust: { fade: 0.45, contrast: -0.15, saturation: -0.1 }, swatch: "#9a958c" },
  {
    id: "vintage",
    label: "Vintage",
    adjust: { warmth: 0.3, fade: 0.3, saturation: -0.25, vignette: 0.35, grain: 0.2 },
    highlights: [0.08, 0.05, -0.05],
    swatch: "#b08a5e",
  },
  { id: "dramatic", label: "Dramatic", adjust: { contrast: 0.45, saturation: -0.15, vignette: 0.45, exposure: -0.1 }, swatch: "#4b4b52" },
  { id: "soft", label: "Soft", adjust: { contrast: -0.2, exposure: 0.1, fade: 0.15 }, swatch: "#d8c7b8" },
  { id: "mono", label: "Mono", adjust: { saturation: -1, contrast: 0.1 }, swatch: "#8a8a8a" },
  { id: "noir", label: "Noir", adjust: { saturation: -1, contrast: 0.5, vignette: 0.5, grain: 0.25 }, swatch: "#2b2b2b" },
];

export const filterById = (id: string | null) => FILTERS.find((f) => f.id === id);

/** Everything the colour shader needs. */
export interface GradeParams extends ColorAdjust {
  shadows: Rgb;
  highlights: Rgb;
}

const ZERO: Rgb = [0, 0, 0];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Combines filter × intensity with the manual sliders. Null when the result is unchanged. */
export function gradeParams(color: ClipColor | undefined): GradeParams | null {
  if (!color) return null;
  const filter = filterById(color.filter);
  const k = filter ? clamp(color.intensity, 0, 1) : 0;
  const out = { ...NEUTRAL_ADJUST } as ColorAdjust;
  for (const key of Object.keys(NEUTRAL_ADJUST) as (keyof ColorAdjust)[]) {
    const lo = key === "fade" || key === "vignette" || key === "grain" ? 0 : -1;
    out[key] = clamp((filter?.adjust[key] ?? 0) * k + color.adjust[key], lo, 1);
  }
  const shadows = (filter?.shadows ?? ZERO).map((v) => v * k) as Rgb;
  const highlights = (filter?.highlights ?? ZERO).map((v) => v * k) as Rgb;
  const neutral =
    Object.values(out).every((v) => Math.abs(v) < 1e-4) &&
    [...shadows, ...highlights].every((v) => Math.abs(v) < 1e-4);
  return neutral ? null : { ...out, shadows, highlights };
}
