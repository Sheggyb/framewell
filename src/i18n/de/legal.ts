import type { legal as en } from "../en/legal";
import type { Translation } from "../types";

export const legal: Translation<typeof en> = {
  translationNote: "Diese Übersetzung dient nur der Orientierung; maßgeblich ist die englische Fassung.",
  lastUpdated: "Zuletzt aktualisiert am {date}",
  privacyLink: "Datenschutz",
  termsLink: "Bedingungen",
  privacy: {
    title: "Datenschutzerklärung",
    intro:
      "Kurz gesagt: Die Framewell-App erhebt keine personenbezogenen Daten von dir. Deine Videos, Fotos, Töne und Projekte bleiben im Browser auf deinem Gerät. Es gibt keine Konten, keine Werbung, keine Analyse und keine Tracking-Cookies. Nur wenn du uns freiwillig auf Ko-fi Trinkgeld gibst, erhalten wir ein paar Angaben, wie unten erklärt.",
    who: {
      title: "Wer wir sind",
      body: "Framewell wird von {name} betrieben. Fragen zum Datenschutz: {email}.",
    },
    device: {
      title: "Was auf deinem Gerät bleibt",
      lead: "Alles, was du mit Framewell erstellst, wird nur auf deinem Gerät verarbeitet und gespeichert, im eigenen Speicher deines Browsers:",
      media: "die Videos, Fotos und Audiodateien, die du hinzufügst, und deine Voiceover-Aufnahmen;",
      projects: "deine Projekte, gespeicherten Textstile und Editor-Einstellungen;",
      exports: "die Videos, die du exportierst.",
      body: "Nichts davon wird zu uns oder zu jemand anderem hochgeladen. Wir können es nicht sehen und es auch nicht für dich wiederherstellen, wenn es gelöscht wird. Nutze <b>Sichern</b>, um eine Kopie als Datei zu behalten.",
    },
    mic: {
      title: "Mikrofon",
      body: "Framewell fragt nur dann nach dem Mikrofon, wenn du ein Voiceover aufnimmst. Die Aufnahme landet direkt in deinem Projekt auf deinem Gerät. Du kannst die Berechtigung jederzeit in den Einstellungen deines Browsers widerrufen.",
    },
    hosting: {
      title: "Was unser Hosting-Anbieter sieht",
      body: "Die Website wird von Vercel gehostet. Wie bei jeder Website fragt dein Browser beim Laden der Seite die Server von Vercel nach den Dateien von Framewell. Diese Anfrage enthält technische Angaben wie deine IP-Adresse und deinen Browsertyp, die der Hoster aus Sicherheitsgründen und für den Betrieb des Dienstes kurzzeitig in Protokollen speichern kann. Wir nutzen diese nicht, um dich zu identifizieren oder Profile zu erstellen. Siehe die <vercel>Datenschutzerklärung von Vercel</vercel>.",
    },
    cookies: {
      title: "Keine Cookies, keine Werbung, keine Tracker",
      body: "Framewell verwendet keine Werbe-, Analyse- oder Tracking-Cookies und keine Tracker von Drittanbietern. Schriften werden von unserer eigenen Website geladen. Der oben genannte Browserspeicher wird nur genutzt, um deine Arbeit auf deinem Gerät zu behalten.",
    },
    sharing: {
      title: "Deine Videos teilen",
      body: "Wenn du ein exportiertes Video speicherst oder teilst, landet es dort, wo du es hinschickst (Fotos, Dateien, TikTok, Instagram…). Ab dann gilt die Datenschutzerklärung der jeweiligen App.",
    },
    tips: {
      title: "Trinkgeld auf Ko-fi",
      body: "Framewell ist kostenlos. Wenn du ein Trinkgeld geben möchtest, öffnen die Links „Framewell unterstützen“ unsere Seite auf Ko-fi in einem neuen Tab; innerhalb von Framewell wird nichts von Ko-fi geladen. Ko-fi (Ko-fi Labs Limited, UK) und seine Zahlungsanbieter (Stripe oder PayPal) wickeln die Zahlung nach ihren eigenen Datenschutzerklärungen ab.",
      controller:
        "Wenn du Trinkgeld gibst, teilt Ko-fi einige Angaben mit uns, und für diese sind wir (unabhängig von Ko-fi) der Verantwortliche. Das erhalten wir und so gehen wir damit um:",
      what: "<b>Was:</b> Betrag und Datum, den Namen oder Benutzernamen, den du angibst, deine E-Mail-Adresse und eine eventuelle Nachricht von dir. Deine Karten- oder Bankdaten erhalten wir nie.",
      why: "<b>Warum:</b> um die erhaltenen Trinkgelder zu dokumentieren, wie es Steuer- und Buchführungsvorschriften verlangen, und um dir zu antworten, wenn du uns kontaktierst. Wir nutzen deine E-Mail-Adresse nicht für Newsletter oder Werbung und geben sie an niemanden weiter.",
      basis: "<b>Rechtsgrundlage:</b> unsere gesetzliche Pflicht, Einnahmen zu dokumentieren, und unser berechtigtes Interesse, auf Nachrichten zu antworten.",
      howLong: "<b>Wie lange:</b> so lange, wie es die schwedischen Steuer- und Buchführungsvorschriften verlangen, danach werden sie gelöscht.",
    },
    rights: {
      title: "Deine Rechte",
      body: "Die einzigen personenbezogenen Daten, die wir haben, stammen aus Trinkgeldern (siehe oben). Wenn du Trinkgeld gegeben hast, kannst du verlangen, deine Angaben einzusehen, zu berichtigen oder zu löschen, oder der Art, wie wir sie nutzen, widersprechen, indem du an {email} schreibst. Was das Gesetz für unsere Unterlagen vorschreibt, dürfen wir behalten. Wenn du mit unserem Umgang mit deinen Daten unzufrieden bist, kannst du dich bei der schwedischen Datenschutzbehörde (<imy>IMY</imy>) beschweren.",
      device:
        "Alles andere, was Framewell speichert, bleibt auf deinem Gerät: Um es zu entfernen, lösche deine Projekte unter <b>Meine Videos</b> oder lösche die Daten dieser Website in den Einstellungen deines Browsers.",
    },
    changes: {
      title: "Änderungen",
      body: "Wenn sich diese Erklärung ändert, aktualisieren wir diese Seite und das Datum oben.",
    },
  },
  terms: {
    title: "Nutzungsbedingungen",
    intro:
      "Kurz gesagt: Framewell ist kostenlos. Was du erstellst, gehört dir, und du bist dafür verantwortlich, dass du die Musik, Clips und Bilder verwenden darfst, die du einfügst. Mach Sicherungen: Deine Arbeit ist nur auf deinem Gerät gespeichert.",
    using: {
      title: "Framewell nutzen",
      body: "Framewell ist ein kostenloser Video-Editor, der in deinem Browser läuft, bereitgestellt von {name}. Wenn du ihn nutzt, stimmst du diesen Bedingungen zu. Wenn du nicht einverstanden bist, nutze ihn bitte nicht.",
    },
    content: {
      title: "Deine Inhalte gehören dir",
      body: "Du behältst alle Rechte an den Videos, die du erstellst. Framewell erhält deine Inhalte nie, und wir beanspruchen keinerlei Rechte daran. Es wird kein Wasserzeichen hinzugefügt.",
    },
    responsibility: {
      title: "Deine Verantwortung",
      rights:
        "Verwende nur Musik, Videos, Bilder und Schriften, die du verwenden darfst. Viele bekannte Songs sind urheberrechtlich geschützt: Trend-Sounds fügst du beim Posten direkt in TikTok, Instagram oder YouTube hinzu.",
      people: "Hol dir die Erlaubnis von Personen, die in deinen Videos zu sehen sind, wo das Gesetz es verlangt.",
      law: "Halte dich an das Gesetz und an die Regeln der Plattformen, auf denen du postest.",
      harm: "Nutze Framewell nicht, um Inhalte zu erstellen, die rechtswidrig sind, anderen schaden oder ihre Rechte verletzen.",
    },
    backups: {
      title: "Mach Sicherungen",
      body: "Deine Projekte sind nur in deinem Browser auf deinem Gerät gespeichert. Sie können verloren gehen, wenn du deine Browserdaten löschst, das Gerät wechselst oder der Browser Speicher freigibt. Wir können sie nicht wiederherstellen. Nutze <b>Sichern</b> unter Meine Videos, um eine Kopie zu behalten.",
    },
    guarantees: {
      title: "Keine Garantien",
      body: "Framewell wird kostenlos, „wie besehen“ und „wie verfügbar“ bereitgestellt. Wir arbeiten daran, dass es zuverlässig läuft, können aber nicht versprechen, dass es immer auf jedem Gerät funktioniert, fehlerfrei ist oder jede Funktion behält. Wir können den Dienst jederzeit ändern oder einstellen.",
    },
    liability: {
      title: "Haftung",
      body: "Soweit gesetzlich zulässig, haften wir nicht für verlorene Projekte, verlorene Inhalte oder andere indirekte Schäden durch die Nutzung von Framewell. Nichts in diesen Bedingungen schränkt Rechte ein, die du nach Verbraucherrecht hast und die nicht ausgeschlossen werden können.",
    },
    names: {
      title: "Namen anderer Unternehmen",
      body: "Framewell nennt TikTok, Instagram, Reels, YouTube und Shorts, damit du weißt, für welche Formate es Videos erstellt. Das sind Marken ihrer jeweiligen Inhaber. Framewell ist unabhängig und steht mit keinem von ihnen in Verbindung, wird von keinem gesponsert und von keinem unterstützt.",
    },
    contact: {
      title: "Änderungen und Kontakt",
      body: "Wir können diese Bedingungen aktualisieren; das Datum oben zeigt die neueste Fassung. Für diese Bedingungen gilt schwedisches Recht. Fragen: {email}.",
    },
  },
};
