import type { legal as en } from "../en/legal";
import type { Translation } from "../types";

export const legal: Translation<typeof en> = {
  translationNote: "Den här översättningen finns för enkelhetens skull; den engelska versionen är den officiella.",
  lastUpdated: "Senast uppdaterad {date}",
  privacyLink: "Integritet",
  termsLink: "Villkor",
  privacy: {
    title: "Integritetspolicy",
    intro:
      "Kort version: Framewell-appen samlar inte in dina personuppgifter. Dina videor, foton, ljud och projekt stannar i webbläsaren på din enhet. Det finns inga konton, annonser, analysverktyg eller spårningscookies. Bara om du väljer att ge oss dricks via Ko-fi får vi några uppgifter, vilket förklaras nedan.",
    who: {
      title: "Vilka vi är",
      body: "Framewell drivs av {name}. Frågor om integritet: {email}.",
    },
    device: {
      title: "Det här stannar på din enhet",
      lead: "Allt du skapar med Framewell bearbetas och lagras bara på din enhet, i webbläsarens egen lagring:",
      media: "videorna, fotona och ljudet du lägger till, och dina voiceover-inspelningar;",
      projects: "dina projekt, sparade textstilar och redigerarens inställningar;",
      exports: "videorna du exporterar.",
      body: "Inget av detta laddas upp till oss eller till någon annan. Vi kan inte se det, och vi kan inte återställa det åt dig om det raderas. Använd <b>Säkerhetskopiera</b> för att spara en kopia som fil.",
    },
    mic: {
      title: "Mikrofon",
      body: "Framewell ber bara om mikrofonen när du spelar in en voiceover. Inspelningen går direkt in i ditt projekt på din enhet. Du kan när som helst återkalla behörigheten i webbläsarens inställningar.",
    },
    hosting: {
      title: "Det här ser vår webbhotellsleverantör",
      body: "Webbplatsen driftas av Vercel. Som på alla webbplatser innebär det att din webbläsare, när sidan laddas, ber Vercels servrar om Framewells filer. Den förfrågan innehåller tekniska uppgifter som din IP-adress och typ av webbläsare, som leverantören kan spara i kortlivade loggar för säkerheten och för att hålla tjänsten igång. Vi använder inte dessa för att identifiera dig eller bygga profiler. Se <vercel>Vercels integritetspolicy</vercel>.",
    },
    cookies: {
      title: "Inga cookies, annonser eller spårare",
      body: "Framewell använder inga cookies för annonser, analys eller spårning, och inga spårare från tredje part. Typsnitten levereras från vår egen webbplats. Webbläsarlagringen som nämns ovan används bara för att spara ditt arbete på din enhet.",
    },
    sharing: {
      title: "Dela dina videor",
      body: "När du sparar eller delar en exporterad video hamnar den där du väljer (Bilder, Filer, TikTok, Instagram…). Från och med då gäller den appens egen integritetspolicy.",
    },
    tips: {
      title: "Dricks via Ko-fi",
      body: "Framewell är gratis. Om du väljer att ge dricks öppnar länkarna ”Stöd Framewell” vår sida på Ko-fi i en ny flik; inget från Ko-fi laddas inuti Framewell. Ko-fi (Ko-fi Labs Limited, Storbritannien) och dess betalningsleverantörer (Stripe eller PayPal) hanterar betalningen enligt sina egna integritetspolicyer.",
      controller:
        "När du ger dricks delar Ko-fi vissa uppgifter med oss, och för dem är vi personuppgiftsansvariga (oberoende av Ko-fi). Det här får vi och så här hanterar vi det:",
      what: "<b>Vad:</b> belopp och datum, namnet eller användarnamnet du anger, din e-postadress och eventuella meddelanden du skriver. Vi får aldrig dina kort- eller bankuppgifter.",
      why: "<b>Varför:</b> för att bokföra den dricks vi får, som skatte- och bokföringsreglerna kräver, och för att svara dig om du kontaktar oss. Vi använder inte din e-postadress för nyhetsbrev eller marknadsföring, och vi delar den inte med någon.",
      basis: "<b>Rättslig grund:</b> vår rättsliga förpliktelse att bokföra inkomster, och vårt berättigade intresse av att svara på meddelanden.",
      howLong: "<b>Hur länge:</b> så länge svenska skatte- och bokföringsregler kräver, därefter raderas de.",
    },
    rights: {
      title: "Dina rättigheter",
      body: "De enda personuppgifter vi har kommer från dricks (se ovan). Om du har gett dricks kan du be att få se, rätta eller radera dina uppgifter, eller invända mot hur vi använder dem, genom att skriva till {email}. Vi kan behålla det som lagen kräver för vår bokföring. Om du är missnöjd med hur vi hanterar dina uppgifter kan du klaga hos Integritetsskyddsmyndigheten (<imy>IMY</imy>).",
      device:
        "Allt annat som Framewell lagrar stannar på din enhet: för att ta bort det, radera dina projekt under <b>Mina videor</b> eller rensa webbplatsens data i webbläsarens inställningar.",
    },
    changes: {
      title: "Ändringar",
      body: "Om den här policyn ändras uppdaterar vi den här sidan och datumet högst upp.",
    },
  },
  terms: {
    title: "Användarvillkor",
    intro:
      "Kort version: Framewell är gratis att använda. Det du skapar är ditt, och du ansvarar för att du har rätt att använda musiken, klippen och bilderna du lägger in. Gör säkerhetskopior: ditt arbete finns bara på din enhet.",
    using: {
      title: "Att använda Framewell",
      body: "Framewell är en gratis videoredigerare som körs i din webbläsare och tillhandahålls av {name}. Genom att använda den godkänner du dessa villkor. Om du inte godkänner dem, använd den inte.",
    },
    content: {
      title: "Ditt innehåll är ditt",
      body: "Du behåller alla rättigheter till videorna du gör. Framewell tar aldrig emot ditt innehåll, och vi gör inte anspråk på några rättigheter till det. Ingen vattenstämpel läggs till.",
    },
    responsibility: {
      title: "Ditt ansvar",
      rights:
        "Använd bara musik, video, bilder och typsnitt som du har rätt att använda. Många populära låtar är upphovsrättsskyddade: trendande ljud lägger du till i TikTok, Instagram eller YouTube när du postar.",
      people: "Be om tillstånd från personer som syns i dina videor där lagen kräver det.",
      law: "Följ lagen och reglerna på plattformarna du postar på.",
      harm: "Använd inte Framewell för att skapa innehåll som är olagligt, skadar andra eller gör intrång i deras rättigheter.",
    },
    backups: {
      title: "Gör säkerhetskopior",
      body: "Dina projekt lagras bara i webbläsaren på din enhet. De kan försvinna om du rensar webbläsarens data, byter enhet eller om webbläsaren frigör utrymme. Vi kan inte återställa dem. Använd <b>Säkerhetskopiera</b> under Mina videor för att spara en kopia.",
    },
    guarantees: {
      title: "Inga garantier",
      body: "Framewell tillhandahålls gratis, ”i befintligt skick” och ”i mån av tillgänglighet”. Vi jobbar för att den ska vara pålitlig, men vi kan inte lova att den alltid fungerar på alla enheter, är fri från fel eller behåller alla funktioner. Vi kan när som helst ändra eller avsluta tjänsten.",
    },
    liability: {
      title: "Ansvar",
      body: "I den utsträckning lagen tillåter ansvarar vi inte för förlorade projekt, förlorat innehåll eller annan indirekt förlust till följd av att du använder Framewell. Inget i dessa villkor begränsar rättigheter du har enligt konsumentlagstiftning som inte kan avtalas bort.",
    },
    names: {
      title: "Andra företags namn",
      body: "Framewell nämner TikTok, Instagram, Reels, YouTube och Shorts så att du vet vilka format den gör videor för. Dessa är varumärken som tillhör sina respektive ägare. Framewell är oberoende och är inte anslutet till, sponsrat av eller godkänt av någon av dem.",
    },
    contact: {
      title: "Ändringar och kontakt",
      body: "Vi kan uppdatera dessa villkor; datumet högst upp visar den senaste versionen. Dessa villkor regleras av svensk lag. Frågor: {email}.",
    },
  },
};
