# Framewell — Technical Spec v0.2

> v0.2 re-targets Framewell at short-form creators (TikTok, Reels, Shorts) and makes mobile the primary platform.

## 1. Product Summary

Framewell is a free, browser-based, manual-first video editor for short-form creators.

**Pitch:** *No watermark. No account. Your videos never leave your phone.*

- Opens instantly in any modern mobile or desktop browser; installable to the home screen (PWA).
- All media processing happens on the user's device. No uploads, no media on any server.
- No AI features. Every cut, caption and effect is placed by the creator.

## 2. Core Principles

- **Manual-first:** No auto-cut, no AI captions, no generative tools. Make manual work *fast* instead.
- **Local-first:** Client-side processing only. Media lives in the browser's private storage (OPFS).
- **No account:** The editor works immediately. Accounts are out of scope until after launch.
- **Mobile-first PWA:** The phone layout is the primary design. Desktop is an expanded layout with keyboard shortcuts.
- **What you see is what you export:** Preview and export share one render pipeline.
- **Deploy target:** Vercel, static + client-side. No backend required.

## 3. Target User

Creators who shoot and edit vertical video on their phone, post to TikTok / Instagram Reels / YouTube Shorts,
and are tired of watermarks, paywalls, forced accounts and uploading their footage.

## 4. Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router), editor route client-only |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui, lucide icons |
| State | Zustand + Immer; undo/redo via Immer patches |
| Demux / mux | Mediabunny (MP4, MOV, WebM, MP3, WAV, …) |
| Decode / encode | WebCodecs (VideoDecoder/Encoder, AudioDecoder/Encoder) |
| Compositing | WebGL2 (effects as fragment shaders); Canvas 2D only as an M0 stopgap |
| Audio | Web Audio API (live preview), OfflineAudioContext (export mixdown) |
| Media storage | OPFS for media blobs; IndexedDB (`idb`) for projects, thumbnails, autosave |
| Heavy work | Web Workers (export, thumbnail/waveform generation) |
| Tests | Vitest (engine, pure TS), Playwright (UI, later) |
| Fallback | ffmpeg.wasm: lazy-loaded, optional, not in v0.x |

**Cross-origin isolation:** all routes send `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` so `SharedArrayBuffer` is available to workers.

**Secure context:** WebCodecs and OPFS require HTTPS (or `localhost`). Test on phones with `pnpm dev:https`.

## 5. Data Model Rules

- All time values are **integer microseconds** (`Micros`). Snap to frames at the project fps.
- Projects carry a `version` field (`PROJECT_SCHEMA_VERSION`); migrations are written when it changes.
- The **main track** is free-placed by default (gaps show black); the **magnet** setting packs it end-to-end.
- Overlay, text, caption and audio tracks are free-placed.
- The engine (`src/engine`) contains no React, so it can run in workers and be unit-tested.

## 6. Feature Scope

### Tier 1 — Launch

- **Canvas & platforms:** 9:16 default (1080×1920). Presets for TikTok, Reels, Shorts, plus 1:1, 4:5, 16:9.
- **Safe-zone overlay:** per-platform guides showing where app UI covers the video.
- **Import:** file picker (`<input type="file">`) for video, audio, images. MP4, MOV, WebM, MP3, WAV, M4A, PNG, JPG.
- **Timeline (mobile pattern):** fixed centre playhead, timeline scrolls underneath; pinch to zoom; tap to select.
- **Editing:** split at playhead, trim handles, delete (ripple on main track), duplicate, reorder.
- **Undo / redo** for every edit.
- **Text overlays:** bold outlined "short-form" style, font, size, colour, stroke, background box.
- **Captions track (manual):** type lines, then *tap-to-time* while playing; edit timing on the timeline; import/export `.srt`.
- **Voiceover:** record from mic straight onto an audio track.
- **Audio:** background music, per-clip volume, fade in/out, manual ducking, mute per track.
- **Reframe:** crop/position landscape footage inside the vertical frame (fit / fill / manual).
- **Playback:** real-time preview, frame-accurate scrubbing.
- **Export:** MP4 (H.264 + AAC) 720p / 1080p, 30 / 60 fps, platform presets, progress + cancel, no watermark.
  Save via download or the OS share sheet (`navigator.share`).
- **Projects:** autosave to IndexedDB, local project list, import/export `.framewell`.

### Tier 2 — "Pro" features

- Zoom punch-ins; keyframes for position / scale / rotation / opacity.
- Speed change and speed ramps (curves); reverse; freeze frame.
- **Beat markers:** tap along to music to drop markers; cuts snap to markers.
- Transitions: crossfade, dip to black/white, slide, whip, zoom, glitch.
- Green screen (manual colour pick), picture-in-picture overlays.
- Colour adjustment (brightness, contrast, saturation, temperature, tint, exposure), static LUT filters.
- Animated caption styles (word pop, highlight).
- Stickers and emoji.

### Tier 3 — Later

- One project → multiple aspect-ratio exports.
- Saved text / caption style presets.
- Desktop power layout: multi-panel, full keyboard shortcuts.
- WebM (VP9 + Opus) export, 4K on capable devices.
- Masks (linear, circular, rectangle), pitch-preserving speed.

## 7. Mobile Constraints

- iOS Safari is the baseline (all iOS browsers use WebKit). Test on real devices from M1.
- Memory: tabs are killed at far lower RAM than desktop. Use preview proxies, cap decoded-frame caches,
  always `close()` `VideoFrame`s.
- Export must hold a Screen Wake Lock; warn users not to leave the tab. Default mobile export: 1080p30.
- iPhone footage is often HEVC and 10-bit HDR: check `canDecode()`, tone-map HDR to SDR.
- Capability detection at startup (WebCodecs, encoder configs, OPFS, wake lock, memory) sets a
  `full` / `lite` / `unsupported` tier. Never UA-sniff.

## 8. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Scaffold, COOP/COEP, PWA manifest, capability detection, engine model + tests, undo/redo, mobile shell: import → timeline → split / delete → scrub preview, safe zones | ✅ |
| M1 | Real-time playback, WebGL2 compositor, trim handles, reorder, thumbnails on clips, OPFS media storage | 🟡 playback with audio, trim/move/reorder with snapping, film-strip thumbnails, WebGL2 colour grading; media stored in IndexedDB (OPFS later) |
| M2 | Export MP4 (worker, WebCodecs + Mediabunny), share sheet, wake lock, progress + cancel | ✅ main-thread export (720p/1080p, 24/30/60 fps, H.264+AAC, WebM fallback); worker version later |
| M3 | Audio: mixing, waveforms, volume/fades, voiceover recording, music track | ✅ mixing, waveforms, per-clip volume/fades, voiceover (own lanes), music |
| M4 | Text overlays + manual captions (tap-to-time, SRT) | ✅ text overlays, stickers (emoji + labels), captions (tap-to-time, split evenly, 6 styles, karaoke word highlight, SRT import/export) |
| M5 | Autosave, project list, `.framewell` import/export → **public launch** | 🟡 autosave (IndexedDB, project + media), project list with thumbnails, rename; `.framewell` file export pending |
| M6+ | Tier 2 features | 🟡 transitions (13), filters + colour adjust, speed 0.1–8× + freeze frame, beat markers, overlays, saved styles, history list |

## 9. Explicit Non-Goals

- No AI features of any kind (including auto-captions).
- No accounts, cloud sync or paid tier before launch.
- No server-side rendering or media uploads.
- No native app (PWA only).
- No social-platform API integrations (sharing via the OS share sheet only).
- No licensed music library; creators add trending sounds inside the platform app.
- No real-time collaboration, no template marketplace.
