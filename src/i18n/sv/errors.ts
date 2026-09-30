import type { errors as en } from "../en/errors";
import type { Translation } from "../types";

export const errors: Translation<typeof en> = {
  import: {
    "image-unreadable": "Kunde inte läsa bilden ”{name}”.",
    "no-tracks": "”{name}” har varken bild eller ljud.",
    "codec-unsupported": "Den här webbläsaren kan inte avkoda {codec}-videon i ”{name}”.",
    unsupported: "”{name}” är inte en mediefil som stöds.",
    failed: "Kunde inte importera ”{name}”.",
    notSaved: "”{name}” finns i ditt projekt men kunde inte sparas på den här enheten (är lagringen full?).",
  },
  export: {
    empty: "Lägg till något på tidslinjen först.",
    "size-unsupported": "Den här enheten kan inte spara video i den här storleken. Testa 720p.",
    "encoder-unsupported": "Den här webbläsaren kan inte koda video. Testa senaste Chrome eller Safari.",
    "no-canvas": "Kunde inte skapa en rityta för exporten.",
    "no-data": "Exporten gav ingen data.",
    failed: "Något gick fel vid exporten. Försök igen.",
    "no-audio": "Den här webbläsaren kan inte spara ljud, så videon blir tyst. Testa senaste Chrome eller Safari.",
    "opus-in-mp4": "Ljudet sparades i ett format som vissa appar inte kan spela upp. Om ljudet saknas efter uppladdning, testa en annan webbläsare.",
  },
  backup: {
    "not-saved": "Det här projektet är inte sparat på den här enheten än.",
    "not-backup": "Det där är ingen Framewell-säkerhetskopia.",
    incomplete: "Säkerhetskopian är ofullständig eller skadad.",
    damaged: "Säkerhetskopian är skadad.",
    "newer-version": "Säkerhetskopian gjordes med en nyare version av Framewell. Ladda om sidan för att uppdatera och försök sedan igen.",
    "restore-failed": "Kunde inte återställa säkerhetskopian. Telefonen kanske har slut på lagringsutrymme.",
    failed: "Något gick fel. Försök igen.",
  },
  storage: {
    saveFailed: "Kunde inte spara projektet på den här enheten.",
    restoreMissing: "Kunde inte återställa: {names}. Importera igen för att fixa det.",
    deleteFailed: "Kunde inte radera ”{name}”. Försök igen.",
  },
};
