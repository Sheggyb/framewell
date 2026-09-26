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
- Keyboard shortcuts are defined once in `src/components/editor/shortcuts.ts` (handler + the list shown in the `?` sheet).
- Mobile-first: design every UI for a phone in portrait first, then enhance at `md:`.
- No AI features, no server-side media processing, no uploads.
