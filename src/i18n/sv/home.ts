import type { home as en } from "../en/home";
import { plural, type Translation } from "../types";

export const home: Translation<typeof en> = {
  tabs: {
    label: "Avsnitt",
    home: "Hem",
    videos: "Mina videor",
    features: "Funktioner",
    privacy: "Integritet",
  },
  newVideo: "Ny video",
  startNew: "Starta en ny video",
  hero: {
    badge: "Gratis videoredigerare · funkar i webbläsaren",
    title: "Redigera dina TikToks, Reels och Shorts <accent>direkt i mobilen.</accent>",
    body: "Klipp dina klipp, lägg till textning, text, musik och övergångar och spara sedan en ren video utan vattenstämpel. Inget konto behövs, och dina videor lämnar aldrig din enhet.",
    seeMore: "Se vad den kan",
  },
  promises: {
    noWatermark: "Ingen vattenstämpel",
    noAccount: "Inget konto",
    onDevice: "Stannar på din enhet",
  },
  demo: {
    wordHighlight: "Ordmarkering",
    animations: "59 animationer",
    export: "1080p · ingen vattenstämpel",
    sticker: "LÄNK I BION",
    caption: "DEN HÄR APPEN ÄR GRATIS",
  },
  videos: {
    title: "Mina <accent>videor</accent>",
    body: "Allt du gör sparas här automatiskt. Tryck på en video för att fortsätta redigera.",
  },
  features: {
    title: "Allt en kreatör <accent>behöver.</accent>",
    body: "Byggd för vertikal video. Varje klipp och varje ord placeras av dig, aldrig gissat.",
    templates: {
      title: "60 färdiga mallar",
      body: "Hooks, listor, storys, kampanjer och avslutningar, redan skrivna. Tryck på en och byt orden.",
    },
    captions: {
      title: "Textning som sitter",
      body: "Tryck i takt för att tajma ditt manus. Ordet som sägs lyser upp, karaokestil.",
    },
    fonts: {
      title: "35 typsnitt, 38 textstilar",
      body: "Konturer, rutor, mjuka skuggor och glöd. Byt stil med ett tryck, eller spara din egen look.",
    },
    animations: {
      title: "59 textanimationer",
      body: "Pop, slam, skrivmaskin, ord för ord och mer. Varenda en placerad av dig.",
    },
    zoom: {
      title: "Zoom och punch-ins",
      body: "Zooma in på ögonblicket som betyder något, på varje beat om du vill, plus långsamma kameraåkningar.",
    },
    transitions: {
      title: "Övergångar och filter",
      body: "13 övergångar, 12 färgfilter och suddiga bakgrunder för liggande klipp.",
    },
  },
  steps: {
    title: "Tre steg. <accent>Det är allt.</accent>",
    add: {
      title: "Lägg till dina klipp",
      body: "Välj videor, foton och musik direkt från mobilen.",
    },
    style: {
      title: "Gör den till din",
      body: "Klipp, texta, styla och animera. Allt görs för hand, inget gissas.",
    },
    export: {
      title: "Exportera och posta",
      body: "Få en ren MP4 i 1080p och posta den var du vill.",
    },
  },
  privacy: {
    title: "Dina videor <accent>lämnar aldrig</accent> din mobil.",
    body: "Framewell redigerar och exporterar direkt på din enhet. Inget laddas upp, ingen annan ser ditt material, det finns inga annonser eller spårare och inget konto att skapa.",
    goodToKnow: "Bra att veta",
    faq: {
      where: {
        q: "Var sparas mina videor?",
        a: "I den här webbläsaren på den här enheten, och ingen annanstans. Framewell har inga servrar som tar emot ditt material.",
      },
      lose: {
        q: "Kan jag förlora mina projekt?",
        a: "Om du rensar webbläsarens data, eller om mobilen får väldigt ont om utrymme, kan webbläsaren radera dem. Använd Säkerhetskopiera (under Mina videor) för att spara en kopia som fil.",
      },
      free: {
        q: "Är det verkligen gratis?",
        a: "Ja. Ingen vattenstämpel, inget konto, ingen provperiod. Exportera hur många videor du vill.",
      },
      music: {
        q: "Kan jag använda vilken musik som helst?",
        a: "Bara musik du har rätt att använda. Trendande ljud lägger du till i TikTok, Instagram eller YouTube när du postar.",
      },
    },
    details: "Detaljerna: <privacy>Integritetspolicy</privacy> · <terms>Användarvillkor</terms>",
  },
  footer: {
    tagline: "<brand>Framewell</brand> · en gratis, privat videoredigerare för kreatörer",
    privacy: "Integritet",
    terms: "Villkor",
    support: "Stöd Framewell ☕",
    trademarks: "TikTok, Instagram, Reels, YouTube och Shorts är varumärken som tillhör sina respektive ägare. Framewell är oberoende och är inte anslutet till eller godkänt av dem.",
  },
  projects: {
    continueEditing: "Fortsätt redigera",
    saved: plural({ one: "{count} sparad på den här enheten", other: "{count} sparade på den här enheten" }),
    restoreHint: "Har du en säkerhetskopia från en annan enhet?",
    backUpLabel: "Säkerhetskopiera {name}",
    backUpTitle: "Säkerhetskopiera till en fil",
    deleteLabel: "Radera {name}",
    confirmDelete: "Radera projektet och dess media på den här enheten? Det går inte att ångra.",
    backupHint: "En fil med projektet och dess media. Öppna den på valfri enhet med ”Öppna en säkerhetskopia”.",
    emptyTitle: "Inga videor än",
    emptyBody: "Allt du gör sparas här, på den här enheten, automatiskt.",
    emptyRestore: "Har du gjort en säkerhetskopia på en annan enhet?",
    liveHere: "Videorna finns bara i den här webbläsaren. Tryck på <icon></icon> för att spara en säkerhetskopia som du kan behålla eller öppna på en annan enhet.",
  },
  backup: {
    backUp: "Säkerhetskopiera projektet",
    preparing: "Förbereder säkerhetskopia…",
    size: "{size} MB",
    missing: "Inte med (finns inte på den här enheten): {names}",
    saveOrShare: "Spara eller dela",
    download: "Ladda ner",
    open: "Öppna en säkerhetskopia",
    opening: "Öppnar säkerhetskopia…",
  },
};
