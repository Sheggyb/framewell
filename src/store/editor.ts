import { applyPatches, enablePatches, produce, produceWithPatches, type Draft, type Patch } from "immer";
import { create } from "zustand";
import { findClip, projectDuration } from "@/engine/model/ops";
import { createProject, type Id, type Project } from "@/engine/model/project";
import type { TextTemplate } from "@/engine/model/templates";
import { clampUs, snapToFrame, type Micros } from "@/engine/model/time";

enablePatches();

const HISTORY_LIMIT = 200;
export const MIN_PX_PER_SECOND = 8;
export const MAX_PX_PER_SECOND = 400;

export type TextTool = "edit" | "style" | "font" | "color" | "animate";
export type MediaTool = "crop" | "frame" | "zoom" | "color" | "speed" | "audio" | "transition";
/** Panels that don't need a selected clip. */
export type GlobalTool = "templates" | "captions" | "stickers" | "voiceover" | "beats";
/** Bottom panels: text tools for text clips, media tools for video/audio clips, plus global tools. */
export type Panel = TextTool | MediaTool | GlobalTool;

const TEXT_TOOLS: readonly Panel[] = ["edit", "style", "font", "color", "animate"];
const MEDIA_TOOLS: readonly Panel[] = ["crop", "frame", "zoom", "color", "speed", "audio", "transition"];
const GLOBAL_TOOLS: readonly Panel[] = ["templates", "captions", "stickers", "voiceover", "beats"];

interface HistoryEntry {
  label: string;
  patches: Patch[];
  inverse: Patch[];
}

/** An in-progress continuous edit (drag, slider, typing) that becomes one undo step. */
interface LiveEdit {
  label: string;
  base: Project;
}

type Recipe = (draft: Draft<Project>) => void;

/** A short message above the toolbar ("Split", "Deleted · Undo"). */
export interface Toast {
  id: number;
  message: string;
  /** Show an Undo button. */
  undo?: boolean;
}

export type Dialog = "history" | "shortcuts" | "project";

/** A question shown in the confirmation sheet before a destructive action. */
export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface EditorState {
  project: Project;
  selectedClipId: Id | null;
  playhead: Micros;
  pxPerSecond: number;
  showSafeZone: boolean;
  panel: Panel | null;
  playing: boolean;
  /** Stop playback here (e.g. when previewing one clip's animation). */
  playUntil: Micros | null;
  /** Where the playhead jumps back to when a ranged preview finishes. */
  playReturnTo: Micros | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  liveEdit: LiveEdit | null;
  /** Aspect ratio (w/h) the crop box is locked to, or null for free cropping. */
  cropAspect: number | null;
  confirm: ConfirmRequest | null;
  /** Timeline shrunk to a slim scrub bar, leaving more room for the video. */
  timelineCollapsed: boolean;
  /** Visible timeline width in px (for zoom-to-fit). */
  timelineWidth: number;
  toast: Toast | null;
  dialog: Dialog | null;
  /**
   * A template being browsed in the Templates panel. It is shown on the preview but is not part
   * of the project: pressing the panel's check button is what adds it.
   */
  templatePreview: { template: TextTemplate; lookPreset: string | null } | null;

  /** Applies an undoable change to the project. `recipe` mutates an Immer draft. */
  edit: (label: string, recipe: Recipe) => void;
  /**
   * Applies a change without recording history yet. Recipes are applied to the state from
   * when this live edit began, so they must set absolute values. Call `commitLive` to finish.
   */
  live: (label: string, recipe: Recipe) => void;
  commitLive: () => void;
  undo: () => void;
  redo: () => void;
  setPlayhead: (t: Micros) => void;
  select: (clipId: Id | null) => void;
  openPanel: (panel: Panel | null) => void;
  setZoom: (pxPerSecond: number) => void;
  toggleSafeZone: () => void;
  play: (from?: Micros, until?: Micros, returnTo?: Micros) => void;
  /** Replaces the whole editor state with a (new or restored) project. Clears history. */
  openProject: (project: Project) => void;
  setCropAspect: (ratio: number | null) => void;
  /** Opens the confirmation sheet. */
  ask: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  setTimelineCollapsed: (collapsed: boolean) => void;
  setTimelineWidth: (px: number) => void;
  /** Selects a template to show on the preview (deselect with null). */
  setTemplatePreview: (preview: { template: TextTemplate; lookPreset: string | null } | null) => void;
  /** Zooms the timeline so the whole project fits on screen. */
  zoomToFit: () => void;
  showToast: (message: string, options?: { undo?: boolean }) => void;
  hideToast: () => void;
  openDialog: (dialog: Dialog | null) => void;
  /** Undoes or redoes until `past.length === steps` (for the history list). */
  jumpHistory: (steps: number) => void;
  pause: () => void;
  togglePlay: () => void;
}

/** Drops a selection that no longer exists (e.g. after undoing the clip's creation). */
const validSelection = (project: Project, id: Id | null) => (id && findClip(project, id) ? id : null);

export const useEditor = create<EditorState>()((set, get) => {
  const pushHistory = (entry: HistoryEntry, project: Project) =>
    set((s) => ({
      project,
      past: [...s.past, entry].slice(-HISTORY_LIMIT),
      future: [],
      selectedClipId: validSelection(project, s.selectedClipId),
      playhead: Math.min(s.playhead, projectDuration(project)),
    }));

  return {
    project: createProject(),
    selectedClipId: null,
    playhead: 0,
    pxPerSecond: 60,
    showSafeZone: true,
    panel: null,
    playing: false,
    playUntil: null,
    playReturnTo: null,
    past: [],
    future: [],
    liveEdit: null,
    cropAspect: null,
    confirm: null,
    timelineCollapsed: false,
    timelineWidth: 0,
    toast: null,
    dialog: null,
    templatePreview: null,

    edit: (label, recipe) => {
      get().commitLive();
      // Wrapped so a recipe that returns a value can't accidentally replace the whole project.
      const [project, patches, inverse] = produceWithPatches(get().project, (draft) => {
        recipe(draft);
      });
      if (patches.length === 0) return;
      pushHistory({ label, patches, inverse }, project);
    },

    live: (label, recipe) => {
      if (get().liveEdit && get().liveEdit?.label !== label) get().commitLive();
      const base = get().liveEdit?.base ?? get().project;
      const project = produce(base, (draft) => {
        recipe(draft);
      });
      set((s) => ({
        liveEdit: { label, base },
        project,
        selectedClipId: validSelection(project, s.selectedClipId),
      }));
    },

    commitLive: () => {
      const { liveEdit, project } = get();
      if (!liveEdit) return;
      set({ liveEdit: null });
      if (liveEdit.base === project) return;
      // Whole-project replace patches: cheap, since unchanged subtrees are shared.
      pushHistory(
        {
          label: liveEdit.label,
          patches: [{ op: "replace", path: [], value: project }],
          inverse: [{ op: "replace", path: [], value: liveEdit.base }],
        },
        project,
      );
    },

    undo: () => {
      get().commitLive();
      const { past, future, project, selectedClipId } = get();
      const entry = past.at(-1);
      if (!entry) return;
      const next = applyPatches(project, entry.inverse);
      set({
        project: next,
        past: past.slice(0, -1),
        future: [entry, ...future],
        selectedClipId: validSelection(next, selectedClipId),
      });
    },

    redo: () => {
      get().commitLive();
      const { past, future, project, selectedClipId } = get();
      const entry = future[0];
      if (!entry) return;
      const next = applyPatches(project, entry.patches);
      set({
        project: next,
        past: [...past, entry],
        future: future.slice(1),
        selectedClipId: validSelection(next, selectedClipId),
      });
    },

    setPlayhead: (t) => {
      const { project } = get();
      set({ playhead: clampUs(snapToFrame(t, project.canvas.fps), 0, projectDuration(project)) });
    },

    select: (clipId) => {
      get().commitLive();
      const clip = clipId ? findClip(get().project, clipId)?.clip : undefined;
      // Keep the open panel only if it applies to the newly selected clip.
      set((s) => {
        const tools = clip?.type === "text" ? TEXT_TOOLS : clip?.type === "media" ? MEDIA_TOOLS : GLOBAL_TOOLS;
        const fits = s.panel !== null && tools.includes(s.panel);
        return { selectedClipId: clipId, panel: fits ? s.panel : null };
      });
    },

    openPanel: (panel) => {
      get().commitLive();
      // A browsed template only lives as long as its panel: leaving the panel drops it.
      set({ panel, templatePreview: panel === "templates" ? get().templatePreview : null });
    },

    setZoom: (pxPerSecond) =>
      set({ pxPerSecond: Math.min(MAX_PX_PER_SECOND, Math.max(MIN_PX_PER_SECOND, pxPerSecond)) }),

    toggleSafeZone: () => set((s) => ({ showSafeZone: !s.showSafeZone })),

    play: (from, until, returnTo) => {
      const { project, playhead, setPlayhead } = get();
      const duration = projectDuration(project);
      if (duration === 0) return;
      get().commitLive();
      // Starting at the very end restarts from the beginning.
      setPlayhead(from ?? (playhead >= duration - 1 ? 0 : playhead));
      set({ playing: true, playUntil: until ?? null, playReturnTo: returnTo ?? null });
    },

    pause: () => set({ playing: false, playUntil: null, playReturnTo: null }),

    togglePlay: () => (get().playing ? get().pause() : get().play()),

    setCropAspect: (cropAspect) => set({ cropAspect }),

    ask: (confirm) => set({ confirm }),

    closeConfirm: () => set({ confirm: null }),

    setTimelineCollapsed: (timelineCollapsed) => set({ timelineCollapsed }),

    setTimelineWidth: (timelineWidth) => set({ timelineWidth }),

    setTemplatePreview: (templatePreview) => set({ templatePreview }),

    zoomToFit: () => {
      const { project, timelineWidth, setZoom } = get();
      const seconds = projectDuration(project) / 1_000_000;
      if (seconds > 0 && timelineWidth > 0) setZoom((timelineWidth * 0.8) / seconds);
    },

    showToast: (message, options) => set({ toast: { id: Date.now(), message, undo: options?.undo } }),

    hideToast: () => set({ toast: null }),

    openDialog: (dialog) => set({ dialog }),

    jumpHistory: (steps) => {
      get().commitLive();
      while (get().past.length > steps) get().undo();
      while (get().past.length < steps && get().future.length > 0) get().redo();
    },

    openProject: (project) =>
      set({
        project,
        selectedClipId: null,
        playhead: 0,
        panel: null,
        playing: false,
        playUntil: null,
        playReturnTo: null,
        past: [],
        future: [],
        liveEdit: null,
        templatePreview: null,
      }),
  };
});
