import { plural } from "../types";

/** Texts for the home page (tabs, hero, My videos, features, privacy tab, footer). */
export const home = {
  tabs: {
    label: "Sections",
    home: "Home",
    videos: "My videos",
    features: "Features",
    privacy: "Privacy",
  },
  newVideo: "New video",
  startNew: "Start a new video",
  hero: {
    badge: "Free video editor · works in your browser",
    /** <accent> is the gold, italic part. */
    title: "Edit your TikToks, Reels & Shorts <accent>right on your phone.</accent>",
    body: "Cut your clips, add captions, text, music and transitions, then save a clean video with no watermark. No account needed, and your videos never leave your device.",
    seeMore: "See what it can do",
  },
  promises: {
    noWatermark: "No watermark",
    noAccount: "No account",
    onDevice: "Stays on your device",
  },
  /** The looping phone demo on the Home tab. */
  demo: {
    wordHighlight: "Word highlight",
    animations: "59 animations",
    export: "1080p · no watermark",
    sticker: "LINK IN BIO",
    /** Shown one word at a time, karaoke style (words separated by spaces). */
    caption: "THIS EDITOR IS FREE",
  },
  videos: {
    title: "My <accent>videos</accent>",
    body: "Everything you make is saved here automatically. Tap a video to keep editing.",
  },
  features: {
    title: "Everything a creator <accent>needs.</accent>",
    body: "Built for vertical video. Every cut and every word is placed by you, never guessed.",
    templates: {
      title: "60 ready-made templates",
      body: "Hooks, lists, stories, promos and endings, already written. Tap one, change the words.",
    },
    captions: {
      title: "Captions that land",
      body: "Tap along to time your script. The spoken word lights up, karaoke style.",
    },
    fonts: {
      title: "35 fonts, 38 text styles",
      body: "Outlines, boxes, soft shadows and glow. One tap to restyle, or save your own look.",
    },
    animations: {
      title: "59 text animations",
      body: "Pop, slam, typewriter, word by word and more. Every one placed by you.",
    },
    zoom: {
      title: "Zoom & punch-ins",
      body: "Snap in on the moment that matters, on every beat if you like, plus slow camera moves.",
    },
    transitions: {
      title: "Transitions & filters",
      body: "13 transitions, 12 colour filters, blurred backgrounds for landscape clips.",
    },
  },
  steps: {
    title: "Three steps. <accent>That's it.</accent>",
    add: {
      title: "Add your clips",
      body: "Pick videos, photos and music straight from your phone.",
    },
    style: {
      title: "Make it yours",
      body: "Cut, caption, style and animate. Everything is manual, nothing is guessed.",
    },
    export: {
      title: "Export & post",
      body: "Get a clean 1080p MP4 and post it anywhere.",
    },
  },
  privacy: {
    title: "Your videos <accent>never leave</accent> your phone.",
    body: "Framewell edits and exports right on your device. Nothing is uploaded, nobody else sees your footage, there are no ads or trackers, and there's no account to make.",
    goodToKnow: "Good to know",
    faq: {
      where: {
        q: "Where are my videos stored?",
        a: "In this browser on this device, and nowhere else. Framewell has no servers that receive your footage.",
      },
      lose: {
        q: "Can I lose my projects?",
        a: "If you clear this browser's data, or the phone runs very low on space, the browser may delete them. Use Back up (in My videos) to keep a copy as a file.",
      },
      free: {
        q: "Is it really free?",
        a: "Yes. No watermark, no account, no trial. Export as many videos as you like.",
      },
      music: {
        q: "Can I use any music?",
        a: "Only music you have the right to use. For trending sounds, add them in TikTok, Instagram or YouTube when you post.",
      },
    },
    details: "The details: <privacy>Privacy policy</privacy> · <terms>Terms of use</terms>",
  },
  footer: {
    tagline: "<brand>Framewell</brand> · a free, private video editor for creators",
    privacy: "Privacy",
    terms: "Terms",
    support: "Support Framewell ☕",
    trademarks: "TikTok, Instagram, Reels, YouTube and Shorts are trademarks of their respective owners. Framewell is independent and not affiliated with or endorsed by them.",
  },
  /** Saved projects (My videos, Continue editing). */
  projects: {
    continueEditing: "Continue editing",
    saved: plural({ one: "{count} saved on this device", other: "{count} saved on this device" }),
    restoreHint: "Have a backup from another device?",
    backUpLabel: "Back up {name}",
    backUpTitle: "Back up to a file",
    deleteLabel: "Delete {name}",
    confirmDelete: "Delete this project and its media on this device? This can't be undone.",
    backupHint: "One file with the project and its media. Open it on any device with “Open a backup”.",
    emptyTitle: "No videos yet",
    emptyBody: "Everything you make is saved here, on this device, automatically.",
    emptyRestore: "Made a backup on another device?",
    /** <icon></icon> is the backup (archive) icon. */
    liveHere: "Videos live in this browser only. Tap <icon></icon> to save a backup file you can keep or open on another device.",
  },
  /** Backing up and restoring a project (.framewell files); also used in the editor. */
  backup: {
    backUp: "Back up this project",
    preparing: "Preparing backup…",
    size: "{size} MB",
    missing: "Not included (not on this device): {names}",
    saveOrShare: "Save or share",
    download: "Download",
    open: "Open a backup",
    opening: "Opening backup…",
  },
};
