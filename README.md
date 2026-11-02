# FIGHTER'S ARENA

**Phase 2 — Loading Screen**

A browser-based, 2D side-view fighting game built around **Modern HD Pixel Art**, developed one phase at a time.

> **Current scope:** the **loading screen only**. The project contains a complete, layered pixel-art loading scene, its original soundtrack, real asset preloading, a persistent audio service and a landscape-only responsive shell. It contains **no** Welcome Screen, main menu, character selection, game modes, fighting mechanics, movement, combat systems or placeholder gameplay. Those arrive only on explicit instruction in later phases.

---

## Contents

- [Overview](#overview)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Loading screen design](#loading-screen-design)
- [Progress behaviour](#progress-behaviour)
- [Audio architecture](#audio-architecture)
- [Original soundtrack](#original-soundtrack)
- [Art pipeline](#art-pipeline)
- [Responsive behaviour](#responsive-behaviour)
- [Project structure](#project-structure)
- [Palette](#palette)
- [Coding standards](#coding-standards)
- [Verification](#verification)
- [Phase scope and deferred work](#phase-scope-and-deferred-work)

---

## Overview

Phase 2 recreates the supplied reference composition as **separate, reusable game assets and UI components** — never as one flat background image. A `640 × 360` Phaser 3 scene layers a nighttime Japanese arena, a glowing moon, drifting cloud banks, cherry blossom trees, slow falling petals and embers, warm-orange and violet side lighting, two idle fighters, the `FIGHTER'S ARENA` logo, and a clean progress HUD.

The screen is driven by Phaser's real loader, starts the original theme at 70%, holds at 100% for a short completion beat, then fades out and hands off to the next scene when that scene is registered. A game-level audio service keeps the music alive across that transition.

---

## Technology stack

| Concern      | Choice                                                | Installed version                   |
| ------------ | ----------------------------------------------------- | ----------------------------------- |
| Game engine  | Phaser **3** (ESM/UMD distribution)                   | `phaser@3.90.0`                     |
| Language     | TypeScript (strict)                                   | `typescript@5.9.3`                  |
| Rendering    | HTML5 Canvas / WebGL (`Phaser.AUTO`)                  | —                                   |
| Build tool   | Vite                                                  | `vite@7.3.7`                        |
| Audio        | Web Audio API via Phaser Audio, HTML5 Audio fallback  | Phaser built-in                     |
| Code quality | ESLint (flat config) + Prettier                       | `eslint@10.14.0`, `prettier@3.9.10` |
| Art / audio  | Pillow / NumPy / SciPy pipelines (offline, see below) | not a runtime dependency            |

**Runtime dependency:** `phaser` only. Node `^20.19.0 || >=22.12.0` and npm 10+ are required to build.

---

## Getting started

```bash
git clone <repository-url>
cd Fighters_Arena
nvm use            # optional, uses .nvmrc (Node 22)
npm install
npm run dev        # http://localhost:5173
```

Production build and local preview:

```bash
npm run build
npm run preview    # http://localhost:4173
```

The dev and preview servers bind to `0.0.0.0` and accept proxied host headers, so the app also works inside remote preview environments.

---

## npm scripts

| Script                 | Command                      | Purpose                                       |
| ---------------------- | ---------------------------- | --------------------------------------------- |
| `npm run dev`          | `vite`                       | Development server with HMR                   |
| `npm run build`        | `tsc --noEmit && vite build` | Type-check, then create the production bundle |
| `npm run preview`      | `vite preview`               | Serve the built `dist/`                       |
| `npm run typecheck`    | `tsc --noEmit`               | Strict TypeScript validation                  |
| `npm run lint`         | `eslint .`                   | Lint all JS/TS sources                        |
| `npm run lint:fix`     | `eslint . --fix`             | Apply safe auto-fixes                         |
| `npm run format`       | `prettier --write .`         | Format the repository                         |
| `npm run format:check` | `prettier --check .`         | Verify formatting (CI-friendly)               |

Recommended pre-commit order: `npm run format && npm run lint && npm run typecheck && npm run build`.

---

## Loading screen design

Everything is a separate object at an explicit depth, so the composition stays balanced and readable at any landscape size.

| Layer (depth)             | Component                   | Contents                                                                  |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| Arena (0)                 | `LoadingBackground`         | Night arena plate, moon glow, side light pools, parallax clouds, braziers |
| Clouds (2) / glows (1, 3) | `LoadingBackground`         | Runtime soft-glow texture, three drifting cloud banks                     |
| Flames (5)                | `LoadingBackground`         | Two 4-frame warm sheets, two violet sheets, frame animation               |
| Fighters (8)              | `FighterShowcase`           | Kenji (red, left), Shadow (purple, right), integer-pixel idle bob         |
| Logo (10)                 | `LogoMark`                  | `FIGHTER'S ARENA` mark, entrance scale/alpha tween, gentle float          |
| Atmosphere (12)           | `LoadingAtmosphere`         | 22 falling petals, 16 rising embers, deterministic PRNG                   |
| HUD (20)                  | `ProgressBar`, `LoadingHud` | Bottom vignette, glowing orange→gold bar, percentage, tip, gold diamonds  |

Layout is expressed as fractions of the fixed `640 × 360` resolution in `src/constants/loading.ts`. Phaser `Scale.FIT` + `CENTER_BOTH` keeps every proportion identical on any landscape screen; nothing is stretched.

Animations are gentle by design: logo entrance, cloud drift, flame frames, slow petals/embers, character idle, and a bar glow. All sprites use `pixelArt: true`, `antialias: false`, `roundPixels: true` and CSS `image-rendering: pixelated`.

**Asset reveals are progressive.** `LoadingScene` listens to `FILE_COMPLETE` and reveals each plate as it becomes available, so a slow network never shows a half-empty character or a missing logo. A `COMPLETE` safety net reveals anything whose file event was missed.

---

## Progress behaviour

- `BootScene` decodes the soundtrack (OGG, with MP3 fallback) and attaches the audio service before starting `LoadingScene`.
- `LoadingScene.preload()` queues **10 real assets** (arena, clouds, glow, 2 fighters, logo, petal, ember, 2 flame sheets) through Phaser's loader.
- `PROGRESS` sets `realProgress`; the displayed value is a rate-limited follower (`0.42`/s) that is **never allowed to exceed `realProgress`**. There is no timer that fakes completion and **100% is impossible before `COMPLETE`**.
- `FILE_COMPLETE` counts files and reveals the matching visual. `FILE_LOAD_ERROR` is logged and counted in the debug snapshot.
- At 100%: a bar flash, a percentage pulse, a `560 ms` hold, then a `700 ms` camera fade-out, then `startNextScene()`.
- `startNextScene()` checks `scene.manager.keys` before starting. The Welcome Screen is **not implemented in Phase 2**, so the handoff is a clean fade with an informational console line — no crash, no missing-scene error.
- A DEV-only `window.__FA__` bridge (in `src/utils/debugBridge.ts`) exposes loading/audio snapshots for automated browser verification. It is tree-shaken out of production builds.

---

## Audio architecture

`src/game/audio/AudioManager.ts` is a **game-level singleton**, not a scene object. It is attached in `BootScene` and therefore survives every scene transition.

- `requestMusic(key)` is idempotent: the theme is created **once** and never restarted by progress or scene updates.
- `AudioUnlock` watches `pointerdown`, `mousedown`, `touchstart`, `keydown` and `visibilitychange`, resuming a suspended `AudioContext` on the first valid interaction and starting any pending music immediately.
- If the browser already grants autoplay, music starts without a gesture. If it blocks playback, the state stays `awaiting-unlock` and no sound is created — the code does not pretend playback succeeded.
- `requestAnimationFrame` fade-in from `0` → `0.55` over `2200 ms`, driven by the manager so it is independent of the scene. The actual Web Audio gain node is verified to match.
- Master volume `0.85`; future `playSfx()` and reserved `SFX_KEYS` provide the extension point for menu, UI and combat audio.
- Music is armed by the **real** loader crossing 70% and fired when the on-screen bar reaches 70%, so the trigger is visible and verifiable rather than firing silently while the bar still reads a low number. It always fires **before** 100%.

Audio is emitted as both `theme_main.ogg` and `theme_main.mp3`; Phaser picks the first format the browser can decode.

---

## Original soundtrack

`assets_work/compose_theme.py` synthesises **"Moonlit Duel"** from scratch — no samples or stock loops.

- **96 BPM**, D Hirajoshi mode, 32 bars / 80 s source with a 2 s seam crossfade → **78.00 s** loop.
- Koto-like plucks, shakuhachi-like lead, FM bells, square lead, atmospheric pads, sub bass, layered taiko ensemble, kick/snare/hats, risers and impacts.
- Ducking, convolution reverb, a mastering EQ tilt with a cut around 180 Hz, and a soft limiter.
- Final master: `44.1 kHz` stereo, peak `0.880`, RMS `0.2315`; band balance `12.14 / 29.49 / 33.30 / 13.60 / 3.13 / 2.31 / 3.67 %` across 20–80 / 80–250 / 250–600 / 600–1500 / 1500–4000 / 4000–8000 / 8000–16000 Hz.

The composition was verified analytically (duration, peak, RMS, clipping, band balance, spectrogram). **No subjective listening test** was performed in this environment.

---

## Art pipeline

`assets_work/` holds the offline source art and the reproducible pipelines; only the finished, downsampled plates are committed under `public/assets/`.

- `assets_work/*.png` — five original chroma-keyed pixel-art source plates (arena, Kenji, Shadow, logo, clouds).
- `assets_work/process_assets.py` — chroma key, nearest-neighbour downsampling to the 640×360 grid, palette grading, moon/side glows, petal/ember/flame generation and violet hue shift. Writes all files under `public/assets/`.
- `assets_work/compose_theme.py` — soundtrack synthesis and OGG/MP3 encoding.
- `assets_work/audio_work/` and `assets_work/preview/` are generated working output (WAV master, spectrogram, composite previews, browser verification screenshots) and are **gitignored**.

The UI font is **Anton** (`public/assets/fonts/anton-latin-400-normal.woff2`), loaded through the FontFace API before Phaser boots so Text objects rasterise once with the correct face. Its license is included. No personal watermark or credit appears anywhere in the project.

---

## Responsive behaviour

| Requirement         | Implementation                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Internal resolution | `640 × 360` fixed; target display `1280 × 720` (exact 2×)                                         |
| Landscape scaling   | CSS 16:9 stage capped at `1280 × 720` + Phaser `Scale.FIT` / `CENTER_BOTH`                        |
| Portrait            | `@media (orientation: portrait)` hides the game stage and shows a `#rotate-notice` panel          |
| Pixel integrity     | `pixelArt`, `antialias: false`, `antialiasGL: false`, `roundPixels`, `image-rendering: pixelated` |
| Touch behaviour     | `touch-action: none`, no user zoom, no overscroll, `dvh`-based stage sizing                       |
| 60 FPS target       | `fps.target = 60`; all per-frame work is lightweight object transforms                            |

Verified at `1920×1080`, `1024×768`, `1024×600`, `667×375` (landscape) and `390×844` (portrait). The canvas aspect ratio stayed `16:9` on every landscape size.

---

## Project structure

```
Fighters_Arena/
├── index.html                          # #game-root stage + portrait rotate notice
├── assets_work/                        # Offline art/audio source + reproducible pipelines
│   ├── process_assets.py
│   ├── compose_theme.py
│   └── *.png                           # Chroma-keyed source plates
├── public/assets/
│   ├── arenas/backgrounds/             # arena_night, cloud_bank, flames(+violet)
│   ├── characters/spritesheets/        # kenji, shadow
│   ├── ui/                             # logo, glow, petal, ember
│   ├── fonts/                          # Anton woff2 + license
│   └── audio/music/                    # theme_main.ogg / .mp3
└── src/
    ├── main.ts                         # Font load -> Phaser.Game -> DEV debug bridge
    ├── styles/main.css                 # 16:9 stage, pixelated canvas, rotate notice
    ├── constants/                      # game, palette, assets, scenes, loading
    ├── types/                          # AudioSnapshot, LoadingSnapshot
    ├── utils/                          # math, fonts, runtime textures, debugBridge
    └── game/
        ├── config/gameConfig.ts        # Engine-level config (no scenes inline)
        ├── config/sceneRegistry.ts     # [BootScene, LoadingScene]
        ├── config/gameFlow.ts          # Guarded handoff to the next screen
        ├── scenes/BootScene.ts         # Audio attach + theme decode
        ├── scenes/LoadingScene.ts      # Real loader, reveal, progress, 70%, completion
        ├── audio/                      # AudioManager, AudioUnlock, audioKeys
        └── ui/                         # ProgressBar, LoadingHud, LoadingBackground,
                                        # LoadingAtmosphere, FighterShowcase, LogoMark
```

`sceneRegistry.ts` is the single place where new screens are registered; `gameConfig.ts` never changes for content phases.

---

## Palette

| Token       | Hex       | Role                      |
| ----------- | --------- | ------------------------- |
| Orange      | `#FF5A00` | Primary accent / bar fill |
| Deep Orange | `#D93600` | Primary shadow            |
| Purple      | `#8B2BE2` | Secondary accent          |
| Deep Purple | `#4B176F` | Secondary shadow          |
| Background  | `#101014` | Canvas / vignette         |
| Panel       | `#1B1B22` | UI panels                 |
| White       | `#FFFFFF` | Text                      |
| Gold        | `#FFC247` | Bar highlight / ornaments |

Defined in `src/constants/palette.ts` as CSS strings and numeric Phaser hex values.

---

## Coding standards

- Strict TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `@/` alias for cross-feature imports; relative imports inside a feature.
- `import type` for type-only imports, `as const` for constant tables, explicit return types on public APIs.
- Constants in `src/constants/`, pure logic in `src/utils/`, engine config in `src/game/config/`, visual components in `src/game/ui/`.
- Loading logic, audio management and visual components are deliberately separate modules — no giant single-file scene.

---

## Verification

Run on the Vite dev server with headless Chromium (WebGL via SwiftShader):

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — all pass.
- Visual screenshots at 48%, 70% and 100%, plus desktop/laptop/tablet/mobile-landscape and portrait, with no console errors, page errors, failed requests or HTTP 4xx/5xx.
- All 10 loading assets complete with `loadErrors: 0`; displayed progress never exceeds real progress; `assetsReady` is true before 100%.
- Music requested once at displayed `≈0.703`, one distinct start timestamp, exactly one active sound, and a monotonic `0.005 → 0.55` gain ramp (real `AudioParam.gain`).
- Completion fires exactly once, followed by the guarded handoff and fade-out.
- Portrait shows `ROTATE YOUR DEVICE`; returning to landscape restores the stage.
- Strict-autoplay simulation: `awaiting-unlock` with a suspended context and zero sounds before any gesture; one click starts the theme with the same fade-in.

Headless Chromium runs with muted audio output, so **audible playback was not verified**. Autoplay behaviour varies by browser; the first-interaction unlock is implemented but cannot be guaranteed to start sound without a gesture on every device.

---

## Phase scope and deferred work

**Included in Phase 2:** layered pixel-art loading screen, original soundtrack, real asset preloading and progressive reveals, honest 0→100% progress, 70% music trigger with fade-in, first-interaction audio unlock, future-SFX architecture, completion beat and guarded fade-out, landscape-only responsive shell with portrait rotate notice, and modular TypeScript.

**Explicitly deferred:** Welcome Screen, main menu, character selection, game modes, fighting mechanics, movement, combat systems, AI, settings, and any other screen. Phase 1 setup remains intact.

---

## License

`UNLICENSED` — private project; licensing will be decided before distribution. The Anton font is distributed under its own included license.
