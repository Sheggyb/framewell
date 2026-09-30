import type { legal as enLegal } from "../en/legal";
import type { Translation } from "../types";

export const legal: Translation<typeof enLegal> = {
  translationNote: "Cette traduction est fournie pour plus de commodité ; seule la version anglaise fait foi.",
  lastUpdated: "Dernière mise à jour : {date}",
  privacyLink: "Confidentialité",
  termsLink: "Conditions",
  privacy: {
    title: "Politique de confidentialité",
    intro:
      "En bref : l’application Framewell ne collecte pas tes données personnelles. Tes vidéos, photos, sons et projets restent dans le navigateur de ton appareil. Il n’y a ni comptes, ni publicités, ni outils d’analyse, ni cookies de suivi. Nous ne recevons quelques informations que si tu choisis de nous laisser un pourboire sur Ko-fi, comme expliqué ci-dessous.",
    who: {
      title: "Qui sommes-nous",
      body: "Framewell est exploité par {name}. Questions sur la confidentialité : {email}.",
    },
    device: {
      title: "Ce qui reste sur ton appareil",
      lead: "Tout ce que tu crées avec Framewell est traité et stocké uniquement sur ton appareil, dans le stockage propre à ton navigateur :",
      media: "les vidéos, photos et fichiers audio que tu ajoutes, ainsi que tes enregistrements de voix off ;",
      projects: "tes projets, tes styles de texte enregistrés et tes réglages de l’éditeur ;",
      exports: "les vidéos que tu exportes.",
      body: "Rien de tout cela n’est envoyé, ni à nous ni à personne d’autre. Nous ne pouvons pas le voir, et nous ne pouvons pas le récupérer pour toi s’il est supprimé. Utilise <b>Sauvegarder</b> pour en garder une copie dans un fichier.",
    },
    mic: {
      title: "Microphone",
      body: "Framewell demande l’accès au microphone uniquement quand tu enregistres une voix off. L’enregistrement va directement dans ton projet, sur ton appareil. Tu peux retirer cette autorisation à tout moment dans les réglages de ton navigateur.",
    },
    hosting: {
      title: "Ce que voit notre hébergeur",
      body: "Le site est hébergé par Vercel. Comme pour tout site web, charger la page signifie que ton navigateur demande les fichiers de Framewell aux serveurs de Vercel. Cette requête contient des informations techniques, comme ton adresse IP et le type de ton navigateur, que l’hébergeur peut conserver dans des journaux de courte durée pour des raisons de sécurité et pour assurer le fonctionnement du service. Nous ne les utilisons pas pour t’identifier ni pour créer des profils. Consulte la <vercel>politique de confidentialité de Vercel</vercel>.",
    },
    cookies: {
      title: "Ni cookies, ni publicités, ni traqueurs",
      body: "Framewell n’utilise aucun cookie publicitaire, d’analyse ou de suivi, ni aucun traqueur tiers. Les polices sont servies depuis notre propre site. Le stockage du navigateur mentionné plus haut sert uniquement à garder ton travail sur ton appareil.",
    },
    sharing: {
      title: "Partager tes vidéos",
      body: "Quand tu enregistres ou partages une vidéo exportée, elle va là où tu le choisis (Photos, Fichiers, TikTok, Instagram…). À partir de là, c’est la politique de confidentialité de cette application qui s’applique.",
    },
    tips: {
      title: "Pourboires sur Ko-fi",
      body: "Framewell est gratuit. Si tu choisis de laisser un pourboire, les liens « Soutenir Framewell » ouvrent notre page Ko-fi dans un nouvel onglet ; rien de Ko-fi n’est chargé dans Framewell. Ko-fi (Ko-fi Labs Limited, Royaume-Uni) et ses prestataires de paiement (Stripe ou PayPal) traitent le paiement selon leurs propres politiques de confidentialité.",
      controller:
        "Quand tu laisses un pourboire, Ko-fi nous transmet certaines informations, pour lesquelles nous sommes responsables du traitement (indépendamment de Ko-fi). Voici ce que nous recevons et comment nous le traitons :",
      what: "<b>Quoi :</b> le montant et la date, le nom ou pseudo que tu indiques, ton adresse e-mail et le message éventuel que tu écris. Nous ne recevons jamais tes coordonnées bancaires ni celles de ta carte.",
      why: "<b>Pourquoi :</b> pour tenir un registre des pourboires reçus, comme l’exigent les règles fiscales et comptables, et pour te répondre si tu nous contactes. Nous n’utilisons pas ton e-mail pour des newsletters ou du marketing, et nous ne le partageons avec personne.",
      basis: "<b>Base légale :</b> notre obligation légale de tenir un registre des revenus, et notre intérêt légitime à répondre aux messages.",
      howLong: "<b>Durée :</b> aussi longtemps que l’exigent les règles fiscales et comptables suédoises, puis suppression.",
    },
    rights: {
      title: "Tes droits",
      body: "Les seules données personnelles que nous détenons proviennent des pourboires (voir ci-dessus). Si tu as laissé un pourboire, tu peux nous demander d’accéder à tes données, de les rectifier ou de les supprimer, ou t’opposer à la façon dont nous les utilisons, en écrivant à {email}. Nous pouvons conserver ce que la loi nous oblige à garder dans nos registres. Si tu n’es pas satisfait de la façon dont nous traitons tes données, tu peux déposer une plainte auprès de l’Autorité suédoise de protection de la vie privée (<imy>IMY</imy>).",
      device:
        "Tout le reste de ce que Framewell stocke reste sur ton appareil : pour le supprimer, supprime tes projets dans <b>Mes vidéos</b> ou efface les données de ce site dans les réglages de ton navigateur.",
    },
    changes: {
      title: "Modifications",
      body: "Si cette politique change, nous mettrons à jour cette page et la date indiquée en haut.",
    },
  },
  terms: {
    title: "Conditions d’utilisation",
    intro:
      "En bref : Framewell est gratuit. Ce que tu crées t’appartient, et c’est à toi de t’assurer que tu as le droit d’utiliser la musique, les clips et les images que tu y mets. Fais des sauvegardes : ton travail est stocké uniquement sur ton appareil.",
    using: {
      title: "Utiliser Framewell",
      body: "Framewell est un éditeur vidéo gratuit qui fonctionne dans ton navigateur, fourni par {name}. En l’utilisant, tu acceptes ces conditions. Si tu ne les acceptes pas, merci de ne pas l’utiliser.",
    },
    content: {
      title: "Ton contenu t’appartient",
      body: "Tu conserves tous les droits sur les vidéos que tu crées. Framewell ne reçoit jamais ton contenu, et nous ne revendiquons aucun droit sur celui-ci. Aucun filigrane n’est ajouté.",
    },
    responsibility: {
      title: "Ta responsabilité",
      rights:
        "N’utilise que de la musique, des vidéos, des images et des polices que tu as le droit d’utiliser. Beaucoup de chansons populaires sont protégées par le droit d’auteur : pour les sons tendance, ajoute-les dans TikTok, Instagram ou YouTube au moment de publier.",
      people: "Obtiens l’autorisation des personnes qui apparaissent dans tes vidéos lorsque la loi l’exige.",
      law: "Respecte la loi et les règles des plateformes sur lesquelles tu publies.",
      harm: "N’utilise pas Framewell pour créer du contenu illégal, qui nuit à autrui ou qui porte atteinte à ses droits.",
    },
    backups: {
      title: "Fais des sauvegardes",
      body: "Tes projets sont stockés uniquement dans ton navigateur, sur ton appareil. Ils peuvent être perdus si tu effaces les données de ton navigateur, si tu changes d’appareil ou si le navigateur libère de l’espace. Nous ne pouvons pas les récupérer. Utilise <b>Sauvegarder</b> dans Mes vidéos pour en garder une copie.",
    },
    guarantees: {
      title: "Aucune garantie",
      body: "Framewell est fourni gratuitement, « en l’état » et « selon disponibilité ». Nous faisons en sorte qu’il soit fiable, mais nous ne pouvons pas promettre qu’il fonctionnera toujours sur tous les appareils, qu’il sera exempt d’erreurs, ni qu’il conservera chaque fonction. Nous pouvons modifier ou arrêter le service à tout moment.",
    },
    liability: {
      title: "Responsabilité",
      body: "Dans la mesure permise par la loi, nous ne sommes pas responsables des projets perdus, des contenus perdus ou de tout autre préjudice indirect lié à l’utilisation de Framewell. Rien dans ces conditions ne limite les droits que tu tiens du droit de la consommation et qui ne peuvent pas être exclus.",
    },
    names: {
      title: "Noms d’autres entreprises",
      body: "Framewell mentionne TikTok, Instagram, Reels, YouTube et Shorts pour que tu saches pour quels formats il crée des vidéos. Ce sont des marques de leurs propriétaires respectifs. Framewell est indépendant et n’est ni affilié à aucun d’entre eux, ni sponsorisé, ni approuvé par eux.",
    },
    contact: {
      title: "Modifications et contact",
      body: "Nous pouvons mettre à jour ces conditions ; la date en haut indique la dernière version. Ces conditions sont régies par le droit suédois. Questions : {email}.",
    },
  },
};
