/**
 * Upgrades saved projects to the current schema. Every change to the saved shape adds a step
 * here, so projects from older versions keep opening.
 */
import { DEFAULT_CLIP_COLOR } from "./color";
import { DEFAULT_BACKDROP, FULL_CROP, PROJECT_SCHEMA_VERSION, type Project } from "./project";
import { DEFAULT_TEXT_ANIMATION } from "./text";
import { DEFAULT_ZOOM } from "./zoom";

type Loose = Record<string, unknown>;

export function migrateProject(input: unknown): Project {
  const project = input as Project;
  // v2 → v3: main-track magnet setting (older projects were always packed, so free is equivalent).
  project.mainMagnet ??= false;
  // v3 → v4: beat markers and per-clip colour.
  project.markers ??= [];
  for (const track of project.tracks) {
    for (const clip of track.clips as unknown as Loose[]) {
      if (clip.type === "media") {
        // v1 → v2: fades, transitions, framing and crop.
        clip.fadeIn ??= 0;
        clip.fadeOut ??= 0;
        clip.transition ??= null;
        clip.frame ??= { fit: "fit", x: 0.5, y: 0.5, scale: 1, rotation: 0, flipH: false };
        clip.crop ??= { ...FULL_CROP };
        clip.color ??= { ...DEFAULT_CLIP_COLOR, adjust: { ...DEFAULT_CLIP_COLOR.adjust } };
        // v4 → v5: zoom (camera moves, punch-ins) and background fill.
        clip.zoom ??= { ...DEFAULT_ZOOM, punches: [] };
        clip.backdrop ??= { ...DEFAULT_BACKDROP };
      } else if (clip.type === "text") {
        clip.animation = { ...DEFAULT_TEXT_ANIMATION, ...(clip.animation as Loose) };
      }
    }
  }
  project.version = PROJECT_SCHEMA_VERSION;
  return project;
}
