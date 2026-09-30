/**
 * Error and warning texts, by the `code` the engine or library attaches (see CodedError).
 * Values in {braces} come from the error's `params`.
 */
export const errors = {
  /** Adding a file (src/engine/media/registry.ts, MediaImportError). */
  import: {
    "image-unreadable": 'Couldn\'t read image "{name}".',
    "no-tracks": '"{name}" has no video or audio.',
    "codec-unsupported": 'This browser can\'t decode the {codec} video in "{name}".',
    unsupported: '"{name}" isn\'t a supported media file.',
    failed: 'Couldn\'t import "{name}".',
    notSaved: '"{name}" is in your project but couldn\'t be saved on this device (storage full?).',
  },
  /** Exporting (src/engine/export/exportVideo.ts, ExportError and warnings). */
  export: {
    empty: "Add something to the timeline first.",
    "size-unsupported": "This device can't save video at this size. Try 720p.",
    "encoder-unsupported": "This browser can't encode video. Try the latest Chrome or Safari.",
    "no-canvas": "Couldn't create a drawing surface for export.",
    "no-data": "Export produced no data.",
    failed: "Something went wrong while exporting. Please try again.",
    "no-audio": "This browser can't save sound, so the video is silent. Try the latest Chrome or Safari.",
    "opus-in-mp4": "The sound was saved in a format some apps can't play. If there's no sound after uploading, try another browser.",
  },
  /** Backups (src/lib/backup.ts, BackupError). */
  backup: {
    "not-saved": "This project isn't saved on this device yet.",
    "not-backup": "That isn't a Framewell backup file.",
    incomplete: "This backup file is incomplete or damaged.",
    damaged: "This backup file is damaged.",
    "newer-version": "This backup was made by a newer Framewell. Reload the page to update, then try again.",
    "restore-failed": "Couldn't restore this backup. The phone may be out of storage space.",
    failed: "Something went wrong. Please try again.",
  },
  /** Saving and opening projects. */
  storage: {
    saveFailed: "Couldn't save this project on this device.",
    restoreMissing: "Couldn't restore: {names}. Re-import to fix.",
    deleteFailed: 'Couldn\'t delete "{name}". Please try again.',
  },
};
