import type { home as en } from "../en/home";
import { plural, type Translation } from "../types";

export const home: Translation<typeof en> = {
  tabs: {
    label: "Secciones",
    home: "Inicio",
    videos: "Mis videos",
    features: "Funciones",
    privacy: "Privacidad",
  },
  newVideo: "Nuevo video",
  startNew: "Empezar un video nuevo",
  hero: {
    badge: "Editor de video gratis · funciona en tu navegador",
    title: "Edita tus TikToks, Reels y Shorts <accent>desde tu teléfono.</accent>",
    body: "Corta tus clips, añade subtítulos, texto, música y transiciones, y guarda un video limpio sin marca de agua. Sin cuenta, y tus videos nunca salen de tu dispositivo.",
    seeMore: "Mira lo que puede hacer",
  },
  promises: {
    noWatermark: "Sin marca de agua",
    noAccount: "Sin cuenta",
    onDevice: "Todo en tu dispositivo",
  },
  demo: {
    wordHighlight: "Palabra resaltada",
    animations: "59 animaciones",
    export: "1080p · sin marca de agua",
    sticker: "LINK EN LA BIO",
    caption: "ESTE EDITOR ES GRATIS",
  },
  videos: {
    title: "Mis <accent>videos</accent>",
    body: "Todo lo que creas se guarda aquí automáticamente. Toca un video para seguir editándolo.",
  },
  features: {
    title: "Todo lo que un creador <accent>necesita.</accent>",
    body: "Hecho para video vertical. Cada corte y cada palabra los colocas tú, nada se adivina.",
    templates: {
      title: "60 plantillas listas",
      body: "Ganchos, listas, historias, promos y finales ya escritos. Toca una y cambia las palabras.",
    },
    captions: {
      title: "Subtítulos que enganchan",
      body: "Toca al ritmo para sincronizar tu guion. La palabra que se dice se ilumina, estilo karaoke.",
    },
    fonts: {
      title: "35 fuentes, 38 estilos de texto",
      body: "Contornos, cajas, sombras suaves y brillo. Cambia el estilo con un toque o guarda tu propio look.",
    },
    animations: {
      title: "59 animaciones de texto",
      body: "Pop, golpe, máquina de escribir, palabra por palabra y más. Cada una la colocas tú.",
    },
    zoom: {
      title: "Zoom y punch-ins",
      body: "Acércate de golpe al momento clave, en cada beat si quieres, y añade movimientos de cámara lentos.",
    },
    transitions: {
      title: "Transiciones y filtros",
      body: "13 transiciones, 12 filtros de color y fondos difuminados para clips horizontales.",
    },
  },
  steps: {
    title: "Tres pasos. <accent>Y listo.</accent>",
    add: {
      title: "Añade tus clips",
      body: "Elige videos, fotos y música directamente desde tu teléfono.",
    },
    style: {
      title: "Hazlo tuyo",
      body: "Corta, subtitula, dale estilo y anímalo. Todo es manual, nada se adivina.",
    },
    export: {
      title: "Exporta y publica",
      body: "Obtén un MP4 limpio en 1080p y publícalo donde quieras.",
    },
  },
  privacy: {
    title: "Tus videos <accent>nunca salen</accent> de tu teléfono.",
    body: "Framewell edita y exporta directamente en tu dispositivo. No se sube nada, nadie más ve tus grabaciones, no hay anuncios ni rastreadores, y no hace falta crear una cuenta.",
    goodToKnow: "Bueno saberlo",
    faq: {
      where: {
        q: "¿Dónde se guardan mis videos?",
        a: "En este navegador, en este dispositivo, y en ningún otro sitio. Framewell no tiene servidores que reciban tus grabaciones.",
      },
      lose: {
        q: "¿Puedo perder mis proyectos?",
        a: "Si borras los datos de este navegador, o el teléfono se queda casi sin espacio, el navegador puede eliminarlos. Usa Copia de seguridad (en Mis videos) para guardar una copia como archivo.",
      },
      free: {
        q: "¿De verdad es gratis?",
        a: "Sí. Sin marca de agua, sin cuenta, sin periodo de prueba. Exporta todos los videos que quieras.",
      },
      music: {
        q: "¿Puedo usar cualquier música?",
        a: "Solo música que tengas derecho a usar. Para los sonidos en tendencia, añádelos en TikTok, Instagram o YouTube al publicar.",
      },
    },
    details: "Los detalles: <privacy>Política de privacidad</privacy> · <terms>Términos de uso</terms>",
  },
  footer: {
    tagline: "<brand>Framewell</brand> · un editor de video gratis y privado para creadores",
    privacy: "Privacidad",
    terms: "Términos",
    support: "Apoya a Framewell ☕",
    trademarks: "TikTok, Instagram, Reels, YouTube y Shorts son marcas comerciales de sus respectivos propietarios. Framewell es independiente y no está afiliado a ellos ni cuenta con su respaldo.",
  },
  projects: {
    continueEditing: "Seguir editando",
    saved: plural({ one: "{count} guardado en este dispositivo", other: "{count} guardados en este dispositivo" }),
    restoreHint: "¿Tienes una copia de seguridad de otro dispositivo?",
    backUpLabel: "Hacer copia de {name}",
    backUpTitle: "Guardar copia en un archivo",
    deleteLabel: "Eliminar {name}",
    confirmDelete: "¿Eliminar este proyecto y sus archivos de este dispositivo? No se puede deshacer.",
    backupHint: "Un archivo con el proyecto y sus archivos multimedia. Ábrelo en cualquier dispositivo con «Abrir una copia».",
    emptyTitle: "Aún no hay videos",
    emptyBody: "Todo lo que creas se guarda aquí, en este dispositivo, automáticamente.",
    emptyRestore: "¿Hiciste una copia en otro dispositivo?",
    liveHere: "Los videos solo están en este navegador. Toca <icon></icon> para guardar una copia en un archivo que puedes conservar o abrir en otro dispositivo.",
  },
  backup: {
    backUp: "Hacer copia de este proyecto",
    preparing: "Preparando la copia…",
    size: "{size} MB",
    missing: "No incluido (no está en este dispositivo): {names}",
    saveOrShare: "Guardar o compartir",
    download: "Descargar",
    open: "Abrir una copia",
    opening: "Abriendo la copia…",
  },
};
