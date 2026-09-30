import type { errors as en } from "../en/errors";
import type { Translation } from "../types";

export const errors: Translation<typeof en> = {
  import: {
    "image-unreadable": "Das Bild „{name}“ konnte nicht gelesen werden.",
    "no-tracks": "„{name}“ enthält weder Video noch Ton.",
    "codec-unsupported": "Dieser Browser kann das {codec}-Video in „{name}“ nicht abspielen.",
    unsupported: "„{name}“ ist keine unterstützte Mediendatei.",
    failed: "„{name}“ konnte nicht importiert werden.",
    notSaved: "„{name}“ ist in deinem Projekt, konnte aber nicht auf diesem Gerät gespeichert werden (Speicher voll?).",
  },
  export: {
    empty: "Füge zuerst etwas zur Timeline hinzu.",
    "size-unsupported": "Dieses Gerät kann Videos in dieser Größe nicht speichern. Versuch es mit 720p.",
    "encoder-unsupported": "Dieser Browser kann keine Videos erstellen. Versuch es mit dem neuesten Chrome oder Safari.",
    "no-canvas": "Für den Export konnte keine Zeichenfläche erstellt werden.",
    "no-data": "Beim Export sind keine Daten entstanden.",
    failed: "Beim Exportieren ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
    "no-audio": "Dieser Browser kann keinen Ton speichern, deshalb ist das Video stumm. Versuch es mit dem neuesten Chrome oder Safari.",
    "opus-in-mp4": "Der Ton wurde in einem Format gespeichert, das manche Apps nicht abspielen können. Wenn nach dem Hochladen kein Ton da ist, versuch einen anderen Browser.",
  },
  backup: {
    "not-saved": "Dieses Projekt ist noch nicht auf diesem Gerät gespeichert.",
    "not-backup": "Das ist keine Framewell-Sicherungsdatei.",
    incomplete: "Diese Sicherungsdatei ist unvollständig oder beschädigt.",
    damaged: "Diese Sicherungsdatei ist beschädigt.",
    "newer-version": "Diese Sicherung stammt aus einer neueren Framewell-Version. Lade die Seite neu, um zu aktualisieren, und versuch es dann noch einmal.",
    "restore-failed": "Diese Sicherung konnte nicht wiederhergestellt werden. Vielleicht ist der Speicher des Handys voll.",
    failed: "Etwas ist schiefgelaufen. Bitte versuch es noch einmal.",
  },
  storage: {
    saveFailed: "Dieses Projekt konnte nicht auf diesem Gerät gespeichert werden.",
    restoreMissing: "Nicht wiederhergestellt: {names}. Importiere sie erneut, um das zu beheben.",
    deleteFailed: "„{name}“ konnte nicht gelöscht werden. Bitte versuch es noch einmal.",
  },
};
