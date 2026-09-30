import type { home as enHome } from "../en/home";
import { plural, type Translation } from "../types";

export const home: Translation<typeof enHome> = {
  tabs: {
    label: "Sections",
    home: "Accueil",
    videos: "Mes vidéos",
    features: "Fonctions",
    privacy: "Confidentialité",
  },
  newVideo: "Nouvelle vidéo",
  startNew: "Commencer une nouvelle vidéo",
  hero: {
    badge: "Éditeur vidéo gratuit · fonctionne dans ton navigateur",
    title: "Monte tes TikToks, Reels et Shorts <accent>directement sur ton téléphone.</accent>",
    body: "Coupe tes clips, ajoute sous-titres, texte, musique et transitions, puis enregistre une vidéo propre, sans filigrane. Pas besoin de compte, et tes vidéos ne quittent jamais ton appareil.",
    seeMore: "Découvre ce qu’il sait faire",
  },
  promises: {
    noWatermark: "Sans filigrane",
    noAccount: "Sans compte",
    onDevice: "Reste sur ton appareil",
  },
  demo: {
    wordHighlight: "Mot surligné",
    animations: "59 animations",
    export: "1080p · sans filigrane",
    sticker: "LIEN EN BIO",
    caption: "CET ÉDITEUR EST GRATUIT",
  },
  videos: {
    title: "Mes <accent>vidéos</accent>",
    body: "Tout ce que tu crées est enregistré ici automatiquement. Touche une vidéo pour reprendre le montage.",
  },
  features: {
    title: "Tout ce qu’il faut <accent>aux créateurs.</accent>",
    body: "Pensé pour la vidéo verticale. Chaque coupe et chaque mot, c’est toi qui les places, rien n’est deviné.",
    templates: {
      title: "60 modèles prêts à l’emploi",
      body: "Accroches, listes, stories, promos et fins, déjà rédigées. Touches-en un, change les mots.",
    },
    captions: {
      title: "Des sous-titres qui claquent",
      body: "Tape en rythme pour caler ton texte. Le mot prononcé s’allume, façon karaoké.",
    },
    fonts: {
      title: "35 polices, 38 styles de texte",
      body: "Contours, encadrés, ombres douces et néon. Un geste pour changer de style, ou enregistre ton propre look.",
    },
    animations: {
      title: "59 animations de texte",
      body: "Pop, slam, machine à écrire, mot par mot et plus encore. Chacune placée par toi.",
    },
    zoom: {
      title: "Zoom et punch-ins",
      body: "Zoome sur le moment qui compte, sur chaque beat si tu veux, et ajoute des mouvements de caméra lents.",
    },
    transitions: {
      title: "Transitions et filtres",
      body: "13 transitions, 12 filtres couleur, fonds flous pour les clips à l’horizontale.",
    },
  },
  steps: {
    title: "Trois étapes. <accent>C’est tout.</accent>",
    add: {
      title: "Ajoute tes clips",
      body: "Choisis vidéos, photos et musique directement depuis ton téléphone.",
    },
    style: {
      title: "Fais-en ta vidéo",
      body: "Coupe, sous-titre, stylise et anime. Tout est manuel, rien n’est deviné.",
    },
    export: {
      title: "Exporte et publie",
      body: "Récupère un MP4 propre en 1080p et publie-le où tu veux.",
    },
  },
  privacy: {
    title: "Tes vidéos <accent>ne quittent jamais</accent> ton téléphone.",
    body: "Framewell monte et exporte directement sur ton appareil. Rien n’est mis en ligne, personne d’autre ne voit tes images, il n’y a ni pub ni traqueurs, et aucun compte à créer.",
    goodToKnow: "Bon à savoir",
    faq: {
      where: {
        q: "Où sont stockées mes vidéos ?",
        a: "Dans ce navigateur, sur cet appareil, et nulle part ailleurs. Framewell n’a aucun serveur qui reçoit tes images.",
      },
      lose: {
        q: "Est-ce que je peux perdre mes projets ?",
        a: "Si tu effaces les données de ce navigateur, ou si le téléphone manque vraiment d’espace, le navigateur peut les supprimer. Utilise Sauvegarder (dans Mes vidéos) pour en garder une copie dans un fichier.",
      },
      free: {
        q: "C’est vraiment gratuit ?",
        a: "Oui. Pas de filigrane, pas de compte, pas de période d’essai. Exporte autant de vidéos que tu veux.",
      },
      music: {
        q: "Je peux utiliser n’importe quelle musique ?",
        a: "Seulement la musique que tu as le droit d’utiliser. Pour les sons tendance, ajoute-les dans TikTok, Instagram ou YouTube au moment de publier.",
      },
    },
    details: "Les détails : <privacy>Politique de confidentialité</privacy> · <terms>Conditions d’utilisation</terms>",
  },
  footer: {
    tagline: "<brand>Framewell</brand> · un éditeur vidéo gratuit et privé pour les créateurs",
    privacy: "Confidentialité",
    terms: "Conditions",
    support: "Soutenir Framewell ☕",
    trademarks: "TikTok, Instagram, Reels, YouTube et Shorts sont des marques de leurs propriétaires respectifs. Framewell est indépendant, sans aucun lien avec eux ni approbation de leur part.",
  },
  projects: {
    continueEditing: "Reprendre le montage",
    saved: plural({ one: "{count} enregistrée sur cet appareil", other: "{count} enregistrées sur cet appareil" }),
    restoreHint: "Tu as une sauvegarde d’un autre appareil ?",
    backUpLabel: "Sauvegarder {name}",
    backUpTitle: "Sauvegarder dans un fichier",
    deleteLabel: "Supprimer {name}",
    confirmDelete: "Supprimer ce projet et ses médias de cet appareil ? C’est irréversible.",
    backupHint: "Un seul fichier avec le projet et ses médias. Ouvre-le sur n’importe quel appareil avec « Ouvrir une sauvegarde ».",
    emptyTitle: "Pas encore de vidéos",
    emptyBody: "Tout ce que tu crées est enregistré ici, sur cet appareil, automatiquement.",
    emptyRestore: "Tu as fait une sauvegarde sur un autre appareil ?",
    liveHere: "Les vidéos restent uniquement dans ce navigateur. Touche <icon></icon> pour enregistrer un fichier de sauvegarde à garder ou à ouvrir sur un autre appareil.",
  },
  backup: {
    backUp: "Sauvegarder ce projet",
    preparing: "Préparation de la sauvegarde…",
    size: "{size} Mo",
    missing: "Non inclus (absent de cet appareil) : {names}",
    saveOrShare: "Enregistrer ou partager",
    download: "Télécharger",
    open: "Ouvrir une sauvegarde",
    opening: "Ouverture de la sauvegarde…",
  },
};
