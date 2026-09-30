import type { errors as en } from "../en/errors";
import type { Translation } from "../types";

export const errors: Translation<typeof en> = {
  import: {
    "image-unreadable": "No se pudo leer la imagen «{name}».",
    "no-tracks": "«{name}» no tiene video ni audio.",
    "codec-unsupported": "Este navegador no puede decodificar el video {codec} de «{name}».",
    unsupported: "«{name}» no es un archivo multimedia compatible.",
    failed: "No se pudo importar «{name}».",
    notSaved: "«{name}» está en tu proyecto, pero no se pudo guardar en este dispositivo (¿almacenamiento lleno?).",
  },
  export: {
    empty: "Primero añade algo a la línea de tiempo.",
    "size-unsupported": "Este dispositivo no puede guardar video a este tamaño. Prueba con 720p.",
    "encoder-unsupported": "Este navegador no puede codificar video. Prueba la última versión de Chrome o Safari.",
    "no-canvas": "No se pudo crear una superficie de dibujo para exportar.",
    "no-data": "La exportación no generó datos.",
    failed: "Algo salió mal al exportar. Inténtalo de nuevo.",
    "no-audio": "Este navegador no puede guardar sonido, así que el video queda sin audio. Prueba la última versión de Chrome o Safari.",
    "opus-in-mp4": "El sonido se guardó en un formato que algunas apps no pueden reproducir. Si no hay sonido después de subirlo, prueba otro navegador.",
  },
  backup: {
    "not-saved": "Este proyecto aún no está guardado en este dispositivo.",
    "not-backup": "Ese no es un archivo de copia de seguridad de Framewell.",
    incomplete: "Esta copia de seguridad está incompleta o dañada.",
    damaged: "Esta copia de seguridad está dañada.",
    "newer-version": "Esta copia se hizo con una versión más nueva de Framewell. Recarga la página para actualizar y vuelve a intentarlo.",
    "restore-failed": "No se pudo restaurar esta copia. Puede que el teléfono no tenga espacio suficiente.",
    failed: "Algo salió mal. Inténtalo de nuevo.",
  },
  storage: {
    saveFailed: "No se pudo guardar este proyecto en este dispositivo.",
    restoreMissing: "No se pudo restaurar: {names}. Vuelve a importarlos para arreglarlo.",
    deleteFailed: "No se pudo eliminar «{name}». Inténtalo de nuevo.",
  },
};
