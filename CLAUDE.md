@AGENTS.md

# Framewell

Browser-based, manual-first, local-first video editor for short-form creators (TikTok/Reels/Shorts).
Product spec and roadmap: @SPEC.md

## Commands
- `pnpm dev`: dev server on http://localhost:3000
- `pnpm dev:https`: HTTPS dev server reachable from phones on the LAN (WebCodecs/OPFS need a secure context)
- `pnpm test` / `pnpm typecheck` / `pnpm lint`

## Architecture rules
- `src/engine/` is framework-free TypeScript (no React). It must stay runnable in Web Workers and unit-testable.
- All timeline time values are integer microseconds (`Micros` in `src/engine/model/time.ts`). Convert to seconds only at API boundaries.
- Project state changes go through `useEditor.getState().edit(label, recipe)` so they are undoable (Immer patches). Never `set({ project })` directly.
- Edit operations live in `src/engine/model/ops.ts` as pure functions that mutate a draft; add a Vitest case for each new op.
- Media files/decoders are held in `src/engine/media/registry.ts`, never in project state (project state must stay JSON-serialisable).
- Preview and export both draw frames with `composeFrame` (`src/engine/render/compose.ts`) and plan audio with `planAudio` (`src/engine/audio/plan.ts`). Change rendering there, never in one path only.
- The main track is free-placed by default; with `project.mainMagnet` on it packs end-to-end. Use `settleMain` after main-track edits. Other tracks are free-placed.
- Colour grading runs in `src/engine/render/grade.ts` (WebGL2) from `drawMedia`; filters/adjustments live in `src/engine/model/color.ts`.
- Zoom (punch-ins, camera moves) lives in `src/engine/model/zoom.ts`; punches are stored in source time so they survive split/trim/speed. Background fill (`MediaClip.backdrop`) is drawn by `drawMedia` for main-track clips only.
- Media bytes live in OPFS (`src/lib/opfs.ts`, `media/<projectId>/<assetId>`); `src/lib/storage.ts` keeps their name/type in IndexedDB, falls back to IndexedDB blobs when OPFS fails, and moves old IndexedDB media into OPFS on load.
- `.framewell` backups (`src/lib/backup.ts`): header + manifest JSON + raw media. Restoring always creates a new project with fresh asset ids.
- iPhone: the page runs under the status bar; use the `pt-safe` class for top padding (the body renders a solid `.status-bar-shim`).
- Translations: every user-visible string goes through `t()`/`useT()` (`src/i18n`, rules in `src/i18n/README.md`). English in `src/i18n/en/` is the source; sv, es, de, fr, ar must have the same keys (TypeScript + `src/i18n/i18n.test.ts`). New text needs an entry in all six. Engine code never imports `@/i18n`: it throws `CodedError`s and the UI translates the code. Arabic is right-to-left: use logical Tailwind classes; preview, timeline and dials stay `dir="ltr"`.
- Keyboard shortcuts are defined once in `src/components/editor/shortcuts.ts` (handler + the list shown in the `?` sheet).
- Mobile-first: design every UI for a phone in portrait first, then enhance at `md:`.
- Desktop studio layout (≥1024px, `useIsStudio` in `src/components/editor/Studio.tsx`): tool rail + side panel, big preview, inspector (the same panels, hosted via `PanelHost`), resizable timeline with track headers. Phones keep the dial layout; build features for both. Multi-selection = `selectedClipId` (primary, edited by panels) + `multi`; actions that act on the selection use `selectedIds()` in `src/store/actions.ts`.
- No AI features, no server-side media processing, no uploads.
