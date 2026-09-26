/**
 * Fonts available to text clips. Self-hosted through next/font, which keeps them
 * same-origin (required by cross-origin isolation) and only downloads a font when used.
 */
import {
  Abril_Fatface,
  Anton,
  Archivo_Black,
  Bangers,
  Barlow_Condensed,
  Bebas_Neue,
  Black_Ops_One,
  Bungee,
  Caveat,
  Chewy,
  Creepster,
  Dancing_Script,
  Fredoka,
  Great_Vibes,
  Inter,
  Kalam,
  Lobster,
  Luckiest_Guy,
  Monoton,
  Montserrat,
  Oswald,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Poppins,
  Press_Start_2P,
  Righteous,
  Roboto,
  Rubik,
  Satisfy,
  Shrikhand,
  Space_Mono,
  Syne,
  Titan_One,
  Unbounded,
} from "next/font/google";
import type { TextStyle } from "@/engine/model/text";
import { fontString } from "@/engine/render/text";

// next/font needs literal options per call (no shared/spread objects).
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "800"] });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });
const roboto = Roboto({ subsets: ["latin"], display: "swap", preload: false });
const rubik = Rubik({ subsets: ["latin"], display: "swap", preload: false });
const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false });
const syne = Syne({ subsets: ["latin"], display: "swap", preload: false });
const spacemono = Space_Mono({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] });
const oswald = Oswald({ subsets: ["latin"], display: "swap", preload: false });
const anton = Anton({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const bebas = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const archivo = Archivo_Black({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const barlow = Barlow_Condensed({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "700", "900"] });
const blackops = Black_Ops_One({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const bungee = Bungee({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const pacifico = Pacifico({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const lobster = Lobster({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const dancing = Dancing_Script({ subsets: ["latin"], display: "swap", preload: false });
const satisfy = Satisfy({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const greatvibes = Great_Vibes({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false });
const kalam = Kalam({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] });
const marker = Permanent_Marker({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const bangers = Bangers({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const luckiest = Luckiest_Guy({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const titan = Titan_One({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const chewy = Chewy({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const fredoka = Fredoka({ subsets: ["latin"], display: "swap", preload: false });
const shrikhand = Shrikhand({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const creepster = Creepster({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const righteous = Righteous({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const monoton = Monoton({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const pressstart = Press_Start_2P({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const abril = Abril_Fatface({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });

export type FontCategory = "clean" | "bold" | "script" | "fun" | "retro";

export const FONT_CATEGORIES: [FontCategory | "all", string][] = [
  ["all", "All"],
  ["clean", "Clean"],
  ["bold", "Bold"],
  ["script", "Script"],
  ["fun", "Fun"],
  ["retro", "Retro"],
];

export interface FontOption {
  id: string;
  label: string;
  family: string;
  category: FontCategory;
  /** Weights the font actually has (others would be faked by the browser). */
  weights: number[];
}

const font = (id: string, label: string, family: string, category: FontCategory, weights = [400]): FontOption => ({
  id,
  label,
  family,
  category,
  weights,
});

export const FONTS: FontOption[] = [
  font("montserrat", "Montserrat", montserrat.style.fontFamily, "clean", [400, 700, 800, 900]),
  font("poppins", "Poppins", poppins.style.fontFamily, "clean", [400, 600, 800]),
  font("inter", "Inter", inter.style.fontFamily, "clean", [400, 600, 800, 900]),
  font("roboto", "Roboto", roboto.style.fontFamily, "clean", [400, 700, 900]),
  font("rubik", "Rubik", rubik.style.fontFamily, "clean", [400, 700, 900]),
  font("unbounded", "Unbounded", unbounded.style.fontFamily, "clean", [400, 700, 900]),
  font("syne", "Syne", syne.style.fontFamily, "clean", [400, 700, 800]),
  font("spacemono", "Space Mono", spacemono.style.fontFamily, "clean", [400, 700]),
  font("anton", "Anton", anton.style.fontFamily, "bold"),
  font("bebas", "Bebas Neue", bebas.style.fontFamily, "bold"),
  font("archivo", "Archivo Black", archivo.style.fontFamily, "bold"),
  font("oswald", "Oswald", oswald.style.fontFamily, "bold", [400, 700]),
  font("barlow", "Barlow Cond.", barlow.style.fontFamily, "bold", [500, 700, 900]),
  font("blackops", "Black Ops", blackops.style.fontFamily, "bold"),
  font("bungee", "Bungee", bungee.style.fontFamily, "bold"),
  font("pacifico", "Pacifico", pacifico.style.fontFamily, "script"),
  font("lobster", "Lobster", lobster.style.fontFamily, "script"),
  font("dancing", "Dancing", dancing.style.fontFamily, "script", [400, 700]),
  font("satisfy", "Satisfy", satisfy.style.fontFamily, "script"),
  font("greatvibes", "Great Vibes", greatvibes.style.fontFamily, "script"),
  font("caveat", "Caveat", caveat.style.fontFamily, "script", [400, 700]),
  font("kalam", "Kalam", kalam.style.fontFamily, "script", [400, 700]),
  font("marker", "Marker", marker.style.fontFamily, "script"),
  font("bangers", "Bangers", bangers.style.fontFamily, "fun"),
  font("luckiest", "Luckiest Guy", luckiest.style.fontFamily, "fun"),
  font("titan", "Titan One", titan.style.fontFamily, "fun"),
  font("chewy", "Chewy", chewy.style.fontFamily, "fun"),
  font("fredoka", "Fredoka", fredoka.style.fontFamily, "fun", [400, 600, 700]),
  font("shrikhand", "Shrikhand", shrikhand.style.fontFamily, "fun"),
  font("creepster", "Creepster", creepster.style.fontFamily, "fun"),
  font("righteous", "Righteous", righteous.style.fontFamily, "retro"),
  font("monoton", "Monoton", monoton.style.fontFamily, "retro"),
  font("pressstart", "Pixel", pressstart.style.fontFamily, "retro"),
  font("abril", "Abril Fatface", abril.style.fontFamily, "retro"),
  font("playfair", "Playfair", playfair.style.fontFamily, "retro", [400, 600, 900]),
];

/** System colour-emoji fonts, used by emoji stickers. Not listed in the font picker. */
const EMOJI_FONT = font("emoji", "Emoji", '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif', "fun");

const byId = new Map([...FONTS, EMOJI_FONT].map((f) => [f.id, f]));

export const fontOption = (id: string): FontOption => byId.get(id) ?? FONTS[0];

export const fontFamilyFor = (id: string): string => fontOption(id).family;

/** Canvas can't wait for web fonts by itself, so load them before drawing. */
export async function ensureFontsLoaded(styles: TextStyle[]): Promise<void> {
  await Promise.all(
    styles.map((style) => {
      const f = fontString(style, fontFamilyFor(style.fontId), 32);
      return document.fonts.check(f) ? null : document.fonts.load(f).catch(() => null);
    }),
  );
}
