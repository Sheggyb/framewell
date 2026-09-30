import type { errors as enErrors } from "../en/errors";
import type { Translation } from "../types";

export const errors: Translation<typeof enErrors> = {
  import: {
    "image-unreadable": "Impossible de lire l’image « {name} ».",
    "no-tracks": "« {name} » ne contient ni vidéo ni son.",
    "codec-unsupported": "Ce navigateur ne peut pas décoder la vidéo {codec} de « {name} ».",
    unsupported: "« {name} » n’est pas un fichier média pris en charge.",
    failed: "Impossible d’importer « {name} ».",
    notSaved: "« {name} » est dans ton projet, mais n’a pas pu être enregistré sur cet appareil (stockage plein ?).",
  },
  export: {
    empty: "Ajoute d’abord quelque chose à la timeline.",
    "size-unsupported": "Cet appareil ne peut pas enregistrer de vidéo à cette taille. Essaie en 720p.",
    "encoder-unsupported": "Ce navigateur ne peut pas encoder de vidéo. Essaie la dernière version de Chrome ou Safari.",
    "no-canvas": "Impossible de créer une surface de dessin pour l’export.",
    "no-data": "L’export n’a produit aucune donnée.",
    failed: "Un problème est survenu pendant l’export. Réessaie.",
    "no-audio": "Ce navigateur ne peut pas enregistrer le son, la vidéo sera donc muette. Essaie la dernière version de Chrome ou Safari.",
    "opus-in-mp4": "Le son a été enregistré dans un format que certaines applis ne lisent pas. S’il n’y a pas de son après la mise en ligne, essaie un autre navigateur.",
  },
  backup: {
    "not-saved": "Ce projet n’est pas encore enregistré sur cet appareil.",
    "not-backup": "Ce n’est pas un fichier de sauvegarde Framewell.",
    incomplete: "Ce fichier de sauvegarde est incomplet ou endommagé.",
    damaged: "Ce fichier de sauvegarde est endommagé.",
    "newer-version": "Cette sauvegarde a été créée avec une version plus récente de Framewell. Recharge la page pour mettre à jour, puis réessaie.",
    "restore-failed": "Impossible de restaurer cette sauvegarde. Le téléphone manque peut-être d’espace de stockage.",
    failed: "Un problème est survenu. Réessaie.",
  },
  storage: {
    saveFailed: "Impossible d’enregistrer ce projet sur cet appareil.",
    restoreMissing: "Impossible de restaurer : {names}. Réimporte-les pour corriger.",
    deleteFailed: "Impossible de supprimer « {name} ». Réessaie.",
  },
};
