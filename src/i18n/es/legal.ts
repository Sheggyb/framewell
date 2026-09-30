import type { legal as en } from "../en/legal";
import type { Translation } from "../types";

export const legal: Translation<typeof en> = {
  translationNote: "Esta traducción se ofrece por comodidad; la versión en inglés es la oficial.",
  lastUpdated: "Última actualización: {date}",
  privacyLink: "Privacidad",
  termsLink: "Términos",
  privacy: {
    title: "Política de privacidad",
    intro:
      "En resumen: la app Framewell no recopila tus datos personales. Tus videos, fotos, sonidos y proyectos se quedan en el navegador de tu dispositivo. No hay cuentas, anuncios, analíticas ni cookies de seguimiento. Solo si decides dejarnos una propina en Ko-fi recibimos algunos datos, como se explica más abajo.",
    who: {
      title: "Quiénes somos",
      body: "Framewell lo gestiona {name}. Preguntas sobre privacidad: {email}.",
    },
    device: {
      title: "Lo que se queda en tu dispositivo",
      lead: "Todo lo que creas con Framewell se procesa y se guarda solo en tu dispositivo, en el almacenamiento propio de tu navegador:",
      media: "los videos, fotos y audios que añades, y tus grabaciones de voz en off;",
      projects: "tus proyectos, estilos de texto guardados y ajustes del editor;",
      exports: "los videos que exportas.",
      body: "Nada de esto se sube a nuestros servidores ni a los de nadie más. No podemos verlo, ni recuperarlo por ti si se borra. Usa <b>Copia de seguridad</b> para guardar una copia como archivo.",
    },
    mic: {
      title: "Micrófono",
      body: "Framewell solo pide acceso al micrófono cuando grabas una voz en off. La grabación va directamente a tu proyecto en tu dispositivo. Puedes retirar el permiso en cualquier momento en los ajustes del navegador.",
    },
    hosting: {
      title: "Lo que ve nuestro proveedor de alojamiento",
      body: "El sitio web está alojado en Vercel. Como en cualquier sitio web, al cargar la página tu navegador pide los archivos de Framewell a los servidores de Vercel. Esa solicitud incluye datos técnicos, como tu dirección IP y el tipo de navegador, que el proveedor puede conservar en registros de corta duración por seguridad y para mantener el servicio en funcionamiento. No los usamos para identificarte ni para crear perfiles. Consulta la <vercel>política de privacidad de Vercel</vercel>.",
    },
    cookies: {
      title: "Sin cookies, anuncios ni rastreadores",
      body: "Framewell no usa cookies de publicidad, analítica ni seguimiento, ni rastreadores de terceros. Las fuentes se sirven desde nuestro propio sitio. El almacenamiento del navegador mencionado arriba se usa solo para guardar tu trabajo en tu dispositivo.",
    },
    sharing: {
      title: "Compartir tus videos",
      body: "Cuando guardas o compartes un video exportado, va a donde tú elijas (Fotos, Archivos, TikTok, Instagram…). A partir de ahí, se aplica la política de privacidad de esa app.",
    },
    tips: {
      title: "Propinas en Ko-fi",
      body: "Framewell es gratis. Si decides dejar una propina, los enlaces «Apoya a Framewell» abren nuestra página de Ko-fi en una pestaña nueva; no se carga nada de Ko-fi dentro de Framewell. Ko-fi (Ko-fi Labs Limited, Reino Unido) y sus proveedores de pago (Stripe o PayPal) gestionan el pago conforme a sus propias políticas de privacidad.",
      controller:
        "Cuando dejas una propina, Ko-fi comparte algunos datos con nosotros, y respecto a ellos somos el responsable del tratamiento (de forma independiente de Ko-fi). Esto es lo que recibimos y cómo lo tratamos:",
      what: "<b>Qué:</b> el importe y la fecha, el nombre o nombre de usuario que indiques, tu dirección de correo electrónico y cualquier mensaje que escribas. Nunca recibimos los datos de tu tarjeta ni de tu banco.",
      why: "<b>Para qué:</b> para llevar un registro de las propinas que recibimos, como exigen las normas fiscales y contables, y para responderte si te pones en contacto con nosotros. No usamos tu correo para boletines ni marketing, y no lo compartimos con nadie.",
      basis: "<b>Base jurídica:</b> nuestra obligación legal de llevar un registro de los ingresos y nuestro interés legítimo en responder a los mensajes.",
      howLong: "<b>Durante cuánto tiempo:</b> el tiempo que exijan las normas fiscales y contables suecas; después, se eliminan.",
    },
    rights: {
      title: "Tus derechos",
      body: "Los únicos datos personales que tenemos son los de las propinas (ver arriba). Si dejaste una propina, puedes pedirnos ver, corregir o eliminar tus datos, u oponerte a cómo los usamos, escribiendo a {email}. Podemos conservar lo que la ley exija para nuestros registros. Si no estás conforme con cómo tratamos tus datos, puedes presentar una reclamación ante la Autoridad Sueca de Protección de la Privacidad (<imy>IMY</imy>).",
      device:
        "Todo lo demás que guarda Framewell se queda en tu dispositivo: para eliminarlo, borra tus proyectos en <b>Mis videos</b> o borra los datos de este sitio en los ajustes del navegador.",
    },
    changes: {
      title: "Cambios",
      body: "Si esta política cambia, actualizaremos esta página y la fecha de arriba.",
    },
  },
  terms: {
    title: "Términos de uso",
    intro:
      "En resumen: Framewell es gratis. Lo que creas es tuyo, y eres responsable de tener derecho a usar la música, los clips y las imágenes que incluyas. Haz copias de seguridad: tu trabajo solo existe en tu dispositivo.",
    using: {
      title: "Uso de Framewell",
      body: "Framewell es un editor de video gratuito que funciona en tu navegador, ofrecido por {name}. Al usarlo, aceptas estos términos. Si no estás de acuerdo, no lo uses.",
    },
    content: {
      title: "Tu contenido es tuyo",
      body: "Conservas todos los derechos sobre los videos que creas. Framewell nunca recibe tu contenido y no reclamamos ningún derecho sobre él. No se añade ninguna marca de agua.",
    },
    responsibility: {
      title: "Tu responsabilidad",
      rights:
        "Usa solo música, videos, imágenes y fuentes que tengas derecho a usar. Muchas canciones populares tienen derechos de autor: para los sonidos en tendencia, añádelos dentro de TikTok, Instagram o YouTube al publicar.",
      people: "Pide permiso a las personas que aparecen en tus videos cuando la ley lo exija.",
      law: "Cumple la ley y las normas de las plataformas en las que publicas.",
      harm: "No uses Framewell para crear contenido ilegal, que perjudique a otros o que infrinja sus derechos.",
    },
    backups: {
      title: "Haz copias de seguridad",
      body: "Tus proyectos se guardan solo en el navegador de tu dispositivo. Pueden perderse si borras los datos del navegador, cambias de dispositivo o el navegador libera espacio. No podemos recuperarlos. Usa <b>Copia de seguridad</b> en Mis videos para guardar una copia.",
    },
    guarantees: {
      title: "Sin garantías",
      body: "Framewell se ofrece gratis, «tal cual» y «según disponibilidad». Trabajamos para que sea fiable, pero no podemos prometer que funcione siempre en todos los dispositivos, que esté libre de errores ni que conserve todas sus funciones. Podemos cambiar o interrumpir el servicio en cualquier momento.",
    },
    liability: {
      title: "Responsabilidad",
      body: "En la medida en que la ley lo permita, no somos responsables de proyectos perdidos, contenido perdido ni otras pérdidas indirectas derivadas del uso de Framewell. Nada en estos términos limita los derechos que te otorga la legislación de consumo y que no pueden excluirse.",
    },
    names: {
      title: "Nombres de otras empresas",
      body: "Framewell menciona TikTok, Instagram, Reels, YouTube y Shorts para que sepas para qué formatos crea videos. Son marcas comerciales de sus respectivos propietarios. Framewell es independiente y no está afiliado, patrocinado ni respaldado por ninguno de ellos.",
    },
    contact: {
      title: "Cambios y contacto",
      body: "Podemos actualizar estos términos; la fecha de arriba indica la versión más reciente. Estos términos se rigen por las leyes de Suecia. Preguntas: {email}.",
    },
  },
};
