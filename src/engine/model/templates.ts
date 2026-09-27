/**
 * Text templates: ready-made, already-written text layouts (hooks, lists, stories, promos,
 * endings…) that drop onto the timeline as ordinary text clips the creator then edits.
 * Built in, no marketplace, nothing downloaded.
 *
 * A "look" restyles a whole template with one text preset, so every template comes in
 * several variations.
 */
import { addTextClip } from "./ops";
import type { Id, Project, TextClip } from "./project";
import { applyPreset, createTextClip, presetById, presetStyle, type TextAnimation, type TextStyle } from "./text";
import { frameDuration, secondsToUs, snapToFrame, type Micros } from "./time";

export type TemplateCategory = "hooks" | "lists" | "story" | "lifestyle" | "promo" | "quotes" | "endings";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "hooks", label: "Hooks" },
  { id: "lists", label: "Lists & tips" },
  { id: "story", label: "Story" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "promo", label: "Promo" },
  { id: "quotes", label: "Quotes" },
  { id: "endings", label: "Endings" },
];

export interface TemplateLayer {
  text: string;
  /** Text preset id (see TEXT_PRESETS / STICKER_PRESETS). */
  preset: string;
  /** Centre, as fractions of the canvas. */
  x?: number;
  y?: number;
  /** Size relative to the preset. */
  scale?: number;
  rotation?: number;
  maxWidth?: number;
  /** Seconds after the template starts. */
  at?: number;
  /** Seconds on screen; defaults to the rest of the template. */
  duration?: number;
  /** Tweaks for the template's own look (ignored when the user picks another look). */
  style?: Partial<TextStyle>;
  animation?: Partial<TextAnimation>;
}

export interface TextTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** Seconds. */
  duration: number;
  layers: TemplateLayer[];
}

/** Whole-template restyles. `null` keeps each template's own design. */
export const TEMPLATE_LOOKS: { id: string; label: string; preset: string | null }[] = [
  { id: "original", label: "Original", preset: null },
  { id: "bold", label: "Bold", preset: "classic" },
  { id: "clean", label: "Clean", preset: "minimal" },
  { id: "box", label: "Box", preset: "box-light" },
  { id: "yellow", label: "Yellow", preset: "yellow" },
  { id: "neon", label: "Neon", preset: "neon" },
  { id: "elegant", label: "Elegant", preset: "elegant" },
  { id: "bubble", label: "Bubble", preset: "bubble" },
  { id: "news", label: "News", preset: "news" },
];

/** Presets a look never replaces (emoji must stay emoji). */
const FIXED_PRESETS = new Set(["emoji"]);

// ---------- the library ----------

const TOP = 0.2;
const BOTTOM = 0.74;

/** A numbered list: a title, then one line per item appearing a beat apart. */
function list(
  id: string,
  name: string,
  title: string,
  items: string[],
  { titlePreset = "headline", itemPreset = "box-dark", category = "lists" as TemplateCategory, numbered = true } = {},
): TextTemplate {
  const step = 1.2;
  const first = 0.9;
  const duration = first + items.length * step + 2;
  const spacing = Math.min(0.1, 0.46 / items.length);
  return {
    id,
    name,
    category,
    duration,
    layers: [
      { text: title, preset: titlePreset, y: 0.2, scale: 0.8 },
      ...items.map((item, i) => ({
        text: numbered ? `${i + 1}. ${item}` : item,
        preset: itemPreset,
        y: 0.36 + i * spacing,
        scale: 0.72,
        at: first + i * step,
        animation: { in: "from-left" as const, out: "none" as const },
      })),
    ],
  };
}

/** Lines shown one after another in the same spot, like a day timeline or a story. */
function sequence(
  id: string,
  name: string,
  category: TemplateCategory,
  lines: string[],
  { preset = "box-dark", y = 0.3, each = 2, header, headerPreset = "label-white" }: { preset?: string; y?: number; each?: number; header?: string; headerPreset?: string } = {},
): TextTemplate {
  const layers: TemplateLayer[] = lines.map((text, i) => ({
    text,
    preset,
    y,
    at: i * each,
    duration: each,
    animation: { in: "pop", out: "fade" },
  }));
  if (header) layers.unshift({ text: header, preset: headerPreset, y: 0.15, scale: 0.8 });
  return { id, name, category, duration: lines.length * each, layers };
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  // ----- Hooks -----
  {
    id: "pov",
    name: "POV",
    category: "hooks",
    duration: 4,
    layers: [{ text: "POV: you finally found an editor with no watermark", preset: "classic", y: TOP + 0.05, scale: 0.8, animation: { in: "words", inDuration: secondsToUs(1.2) } }],
  },
  {
    id: "wait-for-it",
    name: "Wait for it",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "WAIT FOR IT", preset: "yellow", y: TOP, animation: { in: "pop", loop: "pulse" } },
      { text: "👀", preset: "emoji", y: TOP + 0.13, scale: 0.6, at: 0.4, animation: { in: "pop", loop: "hop" } },
    ],
  },
  {
    id: "nobody-talks",
    name: "Nobody talks about this",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "Nobody talks about this", preset: "classic", y: TOP, scale: 0.85, animation: { in: "slide-up" } },
      { text: "but they should", preset: "script", y: TOP + 0.09, scale: 0.7, at: 0.8, rotation: -4 },
    ],
  },
  {
    id: "doing-it-wrong",
    name: "You're doing it wrong",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "You've been doing this WRONG", preset: "red-alert", y: TOP, scale: 0.8, animation: { in: "zoom", loop: "shake" } },
      { text: "❌", preset: "emoji", y: TOP + 0.13, scale: 0.55, at: 0.5 },
    ],
  },
  {
    id: "stop-scrolling",
    name: "Stop scrolling",
    category: "hooks",
    duration: 3,
    layers: [
      { text: "STOP SCROLLING", preset: "stamp", y: 0.42, rotation: -6 },
      { text: "🛑", preset: "emoji", y: 0.3, scale: 0.6, animation: { in: "pop", loop: "heartbeat" } },
    ],
  },
  {
    id: "wish-i-knew",
    name: "Wish I knew sooner",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "Things I wish I knew sooner", preset: "headline", y: TOP, scale: 0.7 },
      { text: "(save this)", preset: "handwritten", y: TOP + 0.11, scale: 0.6, at: 0.8 },
    ],
  },
  {
    id: "watch-till-end",
    name: "Watch till the end",
    category: "hooks",
    duration: 4,
    layers: [{ text: "Watch till the end 😳", preset: "box-light", y: TOP, animation: { in: "bounce", loop: "float" } }],
  },
  {
    id: "unpopular-opinion",
    name: "Unpopular opinion",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "UNPOPULAR OPINION", preset: "label-red", y: TOP - 0.03 },
      { text: "Pineapple belongs on pizza", preset: "classic", y: TOP + 0.08, scale: 0.8, at: 0.6, animation: { in: "words", inDuration: secondsToUs(1) } },
    ],
  },
  {
    id: "this-changed",
    name: "This changed everything",
    category: "hooks",
    duration: 4,
    layers: [{ text: "This one trick changed everything", preset: "words", y: TOP + 0.05, scale: 0.8 }],
  },
  {
    id: "dont-skip",
    name: "Don't skip",
    category: "hooks",
    duration: 3,
    layers: [
      { text: "DON'T SKIP", preset: "comic", y: 0.4, animation: { in: "pop", loop: "wiggle" } },
      { text: "you'll regret it", preset: "soft", y: 0.5, scale: 0.6, at: 0.6 },
    ],
  },
  {
    id: "rate-1-10",
    name: "Rate it 1–10",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "Rate this 1–10", preset: "bubble", y: TOP, scale: 0.9 },
      { text: "be honest 👇", preset: "subtitle", y: TOP + 0.09, at: 0.7 },
    ],
  },
  {
    id: "secret",
    name: "The secret",
    category: "hooks",
    duration: 4,
    layers: [
      { text: "the secret nobody tells you…", preset: "typewriter", y: TOP + 0.04 },
      { text: "🤫", preset: "emoji", y: TOP + 0.15, scale: 0.55, at: 1.2 },
    ],
  },

  // ----- Lists & tips -----
  list("top-5", "Top 5", "TOP 5", ["The first one", "The second one", "The third one", "The fourth one", "Number one 🏆"]),
  list("3-tips", "3 quick tips", "3 QUICK TIPS", ["Start before you're ready", "Post every single day", "Reply to every comment"], { itemPreset: "box-light" }),
  list("never-buy", "Never buying again", "Things I'd never buy again", ["Cheap phone cases", "Fast fashion basics", "Gadgets I used once"], { titlePreset: "classic", itemPreset: "minimal" }),
  list("must-haves", "Must-haves", "My must-haves ✨", ["Comfy hoodie", "Good headphones", "Big water bottle", "Phone tripod"], { titlePreset: "script", itemPreset: "label-white", numbered: false }),
  list("red-flags", "Red flags", "🚩 RED FLAGS 🚩", ["Never replies", "Always late", "Hates dogs"], { titlePreset: "red-alert", itemPreset: "box-dark" }),
  list("green-flags", "Green flags", "💚 GREEN FLAGS 💚", ["Remembers little things", "Makes you laugh", "Always on time"], { titlePreset: "classic", itemPreset: "box-light" }),
  list("hacks", "Life hacks", "LIFE HACKS", ["Freeze grapes as ice cubes", "Use a hanger as a phone stand", "Put your keys in your shoe"], { titlePreset: "yellow", itemPreset: "box-dark" }),
  {
    id: "pros-cons",
    name: "Pros vs cons",
    category: "lists",
    duration: 6,
    layers: [
      { text: "PROS", preset: "label-yellow", x: 0.28, y: 0.2 },
      { text: "CONS", preset: "label-red", x: 0.72, y: 0.2 },
      { text: "✅ Fast\n✅ Free\n✅ Easy", preset: "minimal", x: 0.28, y: 0.34, scale: 0.8, maxWidth: 0.42, at: 0.6 },
      { text: "❌ Pricey\n❌ Heavy\n❌ Slow", preset: "minimal", x: 0.72, y: 0.34, scale: 0.8, maxWidth: 0.42, at: 1.4 },
    ],
  },
  sequence("step-by-step", "Step by step", "lists", ["Step 1: Prep everything", "Step 2: Mix it together", "Step 3: Let it rest", "Step 4: Enjoy! 🎉"], {
    header: "HOW TO",
    preset: "box-light",
  }),

  // ----- Story -----
  {
    id: "storytime",
    name: "Storytime",
    category: "story",
    duration: 4,
    layers: [
      { text: "STORYTIME", preset: "label-black", y: TOP - 0.04 },
      { text: "how I almost got fired on day one", preset: "classic", y: TOP + 0.06, scale: 0.75, at: 0.5, animation: { in: "words", inDuration: secondsToUs(1.2) } },
    ],
  },
  {
    id: "part-1",
    name: "Part 1",
    category: "story",
    duration: 4,
    layers: [
      { text: "PART 1", preset: "stamp", x: 0.26, y: 0.13, scale: 0.7, rotation: -5 },
      { text: "You won't believe what happened next", preset: "classic", y: TOP + 0.05, scale: 0.75 },
    ],
  },
  sequence("day-in-life", "Day in my life", "story", ["7:00 AM ☀️ wake up", "8:30 AM ☕ coffee run", "12:00 PM 💻 work mode", "6:00 PM 🏋️ gym", "10:00 PM 🌙 wind down"], {
    header: "A DAY IN MY LIFE",
    headerPreset: "label-black",
    preset: "box-light",
    y: 0.72,
  }),
  {
    id: "before-after",
    name: "Before / After",
    category: "story",
    duration: 6,
    layers: [
      { text: "BEFORE", preset: "label-white", y: 0.15, duration: 3 },
      { text: "AFTER ✨", preset: "label-yellow", y: 0.15, at: 3, animation: { in: "pop", loop: "pulse" } },
    ],
  },
  {
    id: "expectation-reality",
    name: "Expectation vs reality",
    category: "story",
    duration: 6,
    layers: [
      { text: "Expectation", preset: "script", y: 0.18, duration: 3 },
      { text: "Reality 💀", preset: "red-alert", y: 0.18, at: 3, animation: { in: "zoom", loop: "shake" } },
    ],
  },
  {
    id: "how-started",
    name: "How it started / going",
    category: "story",
    duration: 6,
    layers: [
      { text: "how it started", preset: "typewriter", y: 0.18, duration: 3 },
      { text: "how it's going 📈", preset: "typewriter", y: 0.18, at: 3 },
    ],
  },
  {
    id: "me-vs",
    name: "Me vs my friend",
    category: "story",
    duration: 5,
    layers: [
      { text: "me", preset: "bubble", x: 0.27, y: 0.2, scale: 0.8 },
      { text: "my best friend", preset: "bubble", x: 0.73, y: 0.2, scale: 0.6, at: 0.4 },
    ],
  },
  {
    id: "plot-twist",
    name: "Plot twist",
    category: "story",
    duration: 3,
    layers: [{ text: "PLOT TWIST", preset: "retro", y: 0.42, rotation: -4, animation: { in: "bounce", loop: "wiggle" } }],
  },
  {
    id: "chapter",
    name: "Chapter title",
    category: "story",
    duration: 3,
    layers: [
      { text: "CHAPTER ONE", preset: "minimal", y: 0.42, scale: 0.7, style: { letterSpacing: 0.3 } },
      { text: "The beginning", preset: "elegant", y: 0.5, at: 0.6 },
    ],
  },

  // ----- Lifestyle -----
  {
    id: "grwm",
    name: "Get ready with me",
    category: "lifestyle",
    duration: 4,
    layers: [
      { text: "GRWM", preset: "soft", y: TOP - 0.02, scale: 1.3 },
      { text: "for my first date 💕", preset: "subtitle", y: TOP + 0.08, at: 0.5 },
    ],
  },
  {
    id: "outfit",
    name: "Rate my outfit",
    category: "lifestyle",
    duration: 5,
    layers: [
      { text: "OUTFIT OF THE DAY", preset: "headline", y: 0.14, scale: 0.6 },
      { text: "top: thrifted\njeans: vintage\nshoes: gifted", preset: "minimal", x: 0.3, y: 0.62, scale: 0.7, maxWidth: 0.5, at: 1, style: { align: "left" } },
    ],
  },
  {
    id: "recipe",
    name: "Recipe",
    category: "lifestyle",
    duration: 6,
    layers: [
      { text: "15-MIN PASTA 🍝", preset: "yellow", y: 0.14, scale: 0.75 },
      { text: "• 200g pasta\n• 2 garlic cloves\n• chili flakes\n• parmesan", preset: "box-dark", x: 0.35, y: 0.66, scale: 0.65, maxWidth: 0.6, at: 1, style: { align: "left" } },
    ],
  },
  {
    id: "workout",
    name: "Workout",
    category: "lifestyle",
    duration: 6,
    layers: [
      { text: "LEG DAY 🔥", preset: "red-alert", y: 0.14 },
      { text: "3 ROUNDS", preset: "label-white", y: 0.24, scale: 0.8, at: 0.5 },
      { text: "15 squats\n12 lunges\n10 jump squats", preset: "classic", y: 0.66, scale: 0.7, at: 1.2 },
    ],
  },
  {
    id: "hidden-gem",
    name: "Hidden gem",
    category: "lifestyle",
    duration: 5,
    layers: [
      { text: "HIDDEN GEM", preset: "luxury", y: TOP },
      { text: "📍 Lisbon, Portugal", preset: "label-white", y: BOTTOM - 0.06, at: 0.8 },
    ],
  },
  list("travel-guide", "Travel guide", "3 DAYS IN ROME", ["Colosseum at sunrise", "Pasta in Trastevere", "Gelato by the Pantheon"], {
    titlePreset: "headline",
    itemPreset: "label-white",
    category: "lifestyle",
  }),
  {
    id: "weekend-vlog",
    name: "Weekend vlog",
    category: "lifestyle",
    duration: 4,
    layers: [
      { text: "weekend vlog", preset: "script", y: 0.44 },
      { text: "☀️🌿☕", preset: "emoji", y: 0.54, scale: 0.4, at: 0.6 },
    ],
  },
  {
    id: "study-with-me",
    name: "Study with me",
    category: "lifestyle",
    duration: 4,
    layers: [
      { text: "study with me", preset: "handwritten", y: TOP },
      { text: "📚 25 min focus", preset: "box-light", y: TOP + 0.09, scale: 0.7, at: 0.5 },
    ],
  },
  {
    id: "room-tour",
    name: "Room tour",
    category: "lifestyle",
    duration: 4,
    layers: [{ text: "ROOM TOUR 🏠", preset: "bubble", y: TOP, animation: { in: "elastic", loop: "float" } }],
  },

  // ----- Promo -----
  {
    id: "new-drop",
    name: "New drop",
    category: "promo",
    duration: 4,
    layers: [
      { text: "NEW DROP", preset: "headline", y: 0.4, scale: 1.1 },
      { text: "available now", preset: "minimal", y: 0.5, at: 0.6, style: { letterSpacing: 0.2 } },
    ],
  },
  {
    id: "sale",
    name: "Sale",
    category: "promo",
    duration: 4,
    layers: [
      { text: "SALE", preset: "stamp", y: 0.36, scale: 1.4, rotation: -8 },
      { text: "-50% EVERYTHING", preset: "yellow", y: 0.5, scale: 0.8, at: 0.4 },
      { text: "this weekend only", preset: "subtitle", y: 0.58, at: 0.9 },
    ],
  },
  {
    id: "link-in-bio",
    name: "Link in bio",
    category: "promo",
    duration: 3,
    layers: [
      { text: "LINK IN BIO", preset: "label-white", y: BOTTOM - 0.06, animation: { in: "elastic", loop: "pulse" } },
      { text: "👆", preset: "emoji", y: BOTTOM - 0.16, scale: 0.4, animation: { in: "pop", loop: "hop" } },
    ],
  },
  {
    id: "limited",
    name: "Limited time",
    category: "promo",
    duration: 4,
    layers: [
      { text: "⏰ LIMITED TIME", preset: "red-alert", y: TOP, animation: { in: "zoom", loop: "heartbeat" } },
      { text: "only 24 hours left", preset: "classic", y: TOP + 0.08, scale: 0.6, at: 0.5 },
    ],
  },
  {
    id: "giveaway",
    name: "Giveaway",
    category: "promo",
    duration: 5,
    layers: [
      { text: "🎁 GIVEAWAY 🎁", preset: "comic", y: 0.16, scale: 0.8 },
      { text: "1. Follow\n2. Like\n3. Tag a friend", preset: "box-light", y: 0.62, scale: 0.7, at: 0.8 },
    ],
  },
  {
    id: "review",
    name: "Review",
    category: "promo",
    duration: 5,
    layers: [
      { text: "⭐⭐⭐⭐⭐", preset: "emoji", y: 0.16, scale: 0.35 },
      { text: "Honest review", preset: "elegant", y: 0.25, at: 0.4 },
      { text: "worth every penny", preset: "subtitle", y: BOTTOM - 0.04, at: 1.2 },
    ],
  },
  {
    id: "price-tag",
    name: "Price tag",
    category: "promo",
    duration: 4,
    layers: [
      { text: "$29.99", preset: "sticker", x: 0.7, y: 0.3, rotation: 8, animation: { in: "elastic", loop: "wiggle" } },
      { text: "WAS $59", preset: "label-black", x: 0.7, y: 0.39, scale: 0.6, at: 0.5 },
    ],
  },
  {
    id: "coming-soon",
    name: "Coming soon",
    category: "promo",
    duration: 4,
    layers: [
      { text: "COMING SOON", preset: "luxury", y: 0.44 },
      { text: "12.12", preset: "minimal", y: 0.54, at: 0.8, style: { letterSpacing: 0.4 } },
    ],
  },

  // ----- Quotes -----
  {
    id: "quote-elegant",
    name: "Elegant quote",
    category: "quotes",
    duration: 6,
    layers: [
      { text: "“Do it scared.”", preset: "elegant", y: 0.44, scale: 1.1 },
      { text: "— unknown", preset: "minimal", y: 0.53, scale: 0.6, at: 1 },
    ],
  },
  {
    id: "reminder",
    name: "Reminder",
    category: "quotes",
    duration: 5,
    layers: [
      { text: "REMINDER", preset: "label-yellow", y: 0.36 },
      { text: "you're doing better than you think", preset: "handwritten", y: 0.48, at: 0.6 },
    ],
  },
  {
    id: "motivation",
    name: "Daily motivation",
    category: "quotes",
    duration: 5,
    layers: [{ text: "SMALL STEPS EVERY DAY", preset: "words", y: 0.44, animation: { in: "words", inDuration: secondsToUs(1.6) } }],
  },
  {
    id: "note-to-self",
    name: "Note to self",
    category: "quotes",
    duration: 5,
    layers: [
      { text: "note to self:", preset: "typewriter", y: 0.38, scale: 0.8 },
      { text: "rest is productive too", preset: "classic", y: 0.46, scale: 0.8, at: 1.2 },
    ],
  },
  {
    id: "lyric",
    name: "Lyric line",
    category: "quotes",
    duration: 5,
    layers: [{ text: "write your favourite line here", preset: "soft", y: 0.5, animation: { in: "words", inDuration: secondsToUs(1.4) } }],
  },
  {
    id: "affirmation",
    name: "Affirmation",
    category: "quotes",
    duration: 5,
    layers: [
      { text: "I am", preset: "script", y: 0.4 },
      { text: "ENOUGH", preset: "headline", y: 0.5, at: 0.8, animation: { in: "zoom", loop: "breathe" } },
    ],
  },

  // ----- Endings -----
  {
    id: "follow-part-2",
    name: "Follow for part 2",
    category: "endings",
    duration: 3,
    layers: [
      { text: "FOLLOW FOR PART 2", preset: "label-red", y: 0.44, animation: { in: "pop", loop: "pulse" } },
      { text: "👉", preset: "emoji", y: 0.33, scale: 0.45, animation: { in: "pop", loop: "hop" } },
    ],
  },
  {
    id: "comment-below",
    name: "Comment below",
    category: "endings",
    duration: 3,
    layers: [
      { text: "Which one would you pick?", preset: "classic", y: 0.4, scale: 0.75 },
      { text: "comment below 👇", preset: "box-light", y: 0.5, scale: 0.7, at: 0.6 },
    ],
  },
  {
    id: "save-this",
    name: "Save this",
    category: "endings",
    duration: 3,
    layers: [{ text: "save this for later 📌", preset: "sticker", y: 0.44, animation: { in: "elastic", loop: "float" } }],
  },
  {
    id: "thanks",
    name: "Thanks for watching",
    category: "endings",
    duration: 3,
    layers: [
      { text: "thanks for watching", preset: "script", y: 0.42 },
      { text: "🫶", preset: "emoji", y: 0.52, scale: 0.5, at: 0.5, animation: { in: "pop", loop: "heartbeat" } },
    ],
  },
  {
    id: "share-friend",
    name: "Send to a friend",
    category: "endings",
    duration: 3,
    layers: [{ text: "send this to someone who needs it", preset: "bubble", y: 0.44, scale: 0.75 }],
  },
  {
    id: "subscribe",
    name: "Subscribe",
    category: "endings",
    duration: 3,
    layers: [
      { text: "SUBSCRIBE", preset: "red-alert", y: 0.44, animation: { in: "zoom", loop: "heartbeat" } },
      { text: "🔔", preset: "emoji", y: 0.34, scale: 0.45, animation: { in: "pop", loop: "wiggle" } },
    ],
  },
  {
    id: "the-end",
    name: "The end",
    category: "endings",
    duration: 3,
    layers: [{ text: "the end.", preset: "elegant", y: 0.48, scale: 1.2, animation: { in: "fade", out: "fade" } }],
  },
];

export const templateById = (id: string) => TEXT_TEMPLATES.find((t) => t.id === id);

/** The preset a layer is drawn with under a look. */
export const layerPreset = (layer: TemplateLayer, lookPreset: string | null): string =>
  lookPreset && !FIXED_PRESETS.has(layer.preset) ? lookPreset : layer.preset;

/** The text clips a template makes when placed at timeline time `start`. */
export function templateClips(template: TextTemplate, start: Micros, fps: number, lookPreset: string | null = null): TextClip[] {
  const end = start + secondsToUs(template.duration);
  const minLength = frameDuration(fps);
  return template.layers.map((layer) => {
    const at = snapToFrame(start + secondsToUs(layer.at ?? 0), fps);
    const until = layer.duration !== undefined ? Math.min(end, at + secondsToUs(layer.duration)) : end;
    const clip = createTextClip(at, Math.max(minLength, snapToFrame(until, fps) - at));
    const preset = layerPreset(layer, lookPreset);
    applyPreset(clip, presetById(preset));
    if (preset === layer.preset) {
      Object.assign(clip.style, layer.style);
      Object.assign(clip.animation, layer.animation);
    } else {
      // A new look changes the font and colours but keeps the template's sizes and exit.
      clip.style.fontSize = presetStyle(presetById(layer.preset)).fontSize;
      Object.assign(clip.animation, { out: layer.animation?.out ?? clip.animation.out });
    }
    clip.text = layer.text;
    clip.transform = {
      x: layer.x ?? 0.5,
      y: layer.y ?? 0.45,
      scale: layer.scale ?? 1,
      rotation: layer.rotation ?? 0,
    };
    if (layer.maxWidth !== undefined) clip.maxWidth = layer.maxWidth;
    return clip;
  });
}

/** Adds a template's text clips to the project. Returns their ids, first layer first. */
export function applyTemplate(project: Project, template: TextTemplate, start: Micros, lookPreset: string | null = null): Id[] {
  const clips = templateClips(template, start, project.canvas.fps, lookPreset);
  for (const clip of clips) addTextClip(project, clip);
  return clips.map((c) => c.id);
}
