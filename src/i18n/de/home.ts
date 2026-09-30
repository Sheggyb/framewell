import type { home as en } from "../en/home";
import { plural, type Translation } from "../types";

export const home: Translation<typeof en> = {
  tabs: {
    label: "Bereiche",
    home: "Start",
    videos: "Meine Videos",
    features: "Funktionen",
    privacy: "Datenschutz",
  },
  newVideo: "Neues Video",
  startNew: "Neues Video starten",
  hero: {
    badge: "Kostenloser Video-Editor · läuft im Browser",
    title: "Schneide deine TikToks, Reels & Shorts <accent>direkt auf dem Handy.</accent>",
    body: "Schneide deine Clips, füge Untertitel, Text, Musik und Übergänge hinzu und speichere ein sauberes Video ohne Wasserzeichen. Kein Konto nötig, und deine Videos verlassen nie dein Gerät.",
    seeMore: "Sieh dir an, was es kann",
  },
  promises: {
    noWatermark: "Kein Wasserzeichen",
    noAccount: "Kein Konto",
    onDevice: "Bleibt auf deinem Gerät",
  },
  demo: {
    wordHighlight: "Wort-Highlight",
    animations: "59 Animationen",
    export: "1080p · kein Wasserzeichen",
    sticker: "LINK IN BIO",
    caption: "DIESER EDITOR IST KOSTENLOS",
  },
  videos: {
    title: "Meine <accent>Videos</accent>",
    body: "Alles, was du erstellst, wird hier automatisch gespeichert. Tippe auf ein Video, um weiterzumachen.",
  },
  features: {
    title: "Alles, was Creator <accent>brauchen.</accent>",
    body: "Gemacht für Hochformat-Videos. Jeden Schnitt und jedes Wort setzt du selbst, nichts wird geraten.",
    templates: {
      title: "60 fertige Vorlagen",
      body: "Hooks, Listen, Storys, Promos und Outros, schon fertig geschrieben. Tippe eine an und ändere die Wörter.",
    },
    captions: {
      title: "Untertitel, die sitzen",
      body: "Tippe im Takt mit, um dein Skript zu timen. Das gesprochene Wort leuchtet auf, wie beim Karaoke.",
    },
    fonts: {
      title: "35 Schriften, 38 Textstile",
      body: "Konturen, Boxen, weiche Schatten und Glow. Mit einem Tipp neu stylen oder deinen eigenen Look speichern.",
    },
    animations: {
      title: "59 Textanimationen",
      body: "Pop, Slam, Schreibmaschine, Wort für Wort und mehr. Jede einzelne setzt du selbst.",
    },
    zoom: {
      title: "Zoom & Punch-ins",
      body: "Zoom auf den Moment, der zählt, auf Wunsch bei jedem Beat, dazu langsame Kamerafahrten.",
    },
    transitions: {
      title: "Übergänge & Filter",
      body: "13 Übergänge, 12 Farbfilter, unscharfe Hintergründe für Querformat-Clips.",
    },
  },
  steps: {
    title: "Drei Schritte. <accent>Mehr nicht.</accent>",
    add: {
      title: "Clips hinzufügen",
      body: "Wähle Videos, Fotos und Musik direkt von deinem Handy.",
    },
    style: {
      title: "Mach es zu deinem",
      body: "Schneiden, untertiteln, stylen und animieren. Alles von Hand, nichts wird geraten.",
    },
    export: {
      title: "Exportieren & posten",
      body: "Hol dir ein sauberes 1080p-MP4 und poste es überall.",
    },
  },
  privacy: {
    title: "Deine Videos <accent>verlassen nie</accent> dein Handy.",
    body: "Framewell bearbeitet und exportiert direkt auf deinem Gerät. Nichts wird hochgeladen, niemand sonst sieht deine Aufnahmen, es gibt keine Werbung und keine Tracker, und du musst kein Konto anlegen.",
    goodToKnow: "Gut zu wissen",
    faq: {
      where: {
        q: "Wo werden meine Videos gespeichert?",
        a: "In diesem Browser auf diesem Gerät, sonst nirgends. Framewell hat keine Server, die deine Aufnahmen empfangen.",
      },
      lose: {
        q: "Kann ich meine Projekte verlieren?",
        a: "Wenn du die Daten dieses Browsers löschst oder das Handy fast keinen Speicher mehr hat, kann der Browser sie löschen. Nutze „Sichern“ (unter Meine Videos), um eine Kopie als Datei zu behalten.",
      },
      free: {
        q: "Ist das wirklich kostenlos?",
        a: "Ja. Kein Wasserzeichen, kein Konto, keine Testphase. Exportiere so viele Videos, wie du willst.",
      },
      music: {
        q: "Kann ich jede Musik verwenden?",
        a: "Nur Musik, die du verwenden darfst. Trend-Sounds fügst du beim Posten in TikTok, Instagram oder YouTube hinzu.",
      },
    },
    details: "Die Details: <privacy>Datenschutzerklärung</privacy> · <terms>Nutzungsbedingungen</terms>",
  },
  footer: {
    tagline: "<brand>Framewell</brand> · ein kostenloser, privater Video-Editor für Creator",
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    support: "Framewell unterstützen ☕",
    trademarks: "TikTok, Instagram, Reels, YouTube und Shorts sind Marken ihrer jeweiligen Inhaber. Framewell ist unabhängig und steht in keiner Verbindung zu ihnen und wird nicht von ihnen unterstützt.",
  },
  projects: {
    continueEditing: "Weiter bearbeiten",
    saved: plural({ one: "{count} auf diesem Gerät gespeichert", other: "{count} auf diesem Gerät gespeichert" }),
    restoreHint: "Hast du eine Sicherung von einem anderen Gerät?",
    backUpLabel: "{name} sichern",
    backUpTitle: "Als Datei sichern",
    deleteLabel: "{name} löschen",
    confirmDelete: "Dieses Projekt und seine Medien auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.",
    backupHint: "Eine Datei mit dem Projekt und seinen Medien. Öffne sie auf jedem Gerät mit „Sicherung öffnen“.",
    emptyTitle: "Noch keine Videos",
    emptyBody: "Alles, was du erstellst, wird hier automatisch gespeichert, auf diesem Gerät.",
    emptyRestore: "Sicherung auf einem anderen Gerät erstellt?",
    liveHere: "Videos sind nur in diesem Browser gespeichert. Tippe auf <icon></icon>, um eine Sicherungsdatei zu speichern, die du behalten oder auf einem anderen Gerät öffnen kannst.",
  },
  backup: {
    backUp: "Dieses Projekt sichern",
    preparing: "Sicherung wird vorbereitet…",
    size: "{size} MB",
    missing: "Nicht enthalten (nicht auf diesem Gerät): {names}",
    saveOrShare: "Speichern oder teilen",
    download: "Herunterladen",
    open: "Sicherung öffnen",
    opening: "Sicherung wird geöffnet…",
  },
};
