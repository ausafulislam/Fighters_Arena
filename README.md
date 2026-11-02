# FIGHTER'S ARENA

**Phase 3 — Welcome Screen / Main Menu**

A browser-based, 2D side-view fighting game built around **Modern HD Pixel Art**, developed one phase at a time.

> **Current scope:** the **loading screen** and the **Welcome Screen / Main Menu** with its About and mobile-preparation Settings popups. There is **no** character selection, game mode or arena selection, leaderboard functionality, fighting mechanics, gameplay, or any other screen. PLAY, LEADERBOARD and QUIT are display-only buttons with hover / press feedback.

---

## Contents

- [Overview](#overview)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Screen design](#screen-design)
- [Menu and buttons](#menu-and-buttons)
- [Popups](#popups)
- [Mobile settings persistence](#mobile-settings-persistence)
- [Audio continuity](#audio-continuity)
- [Art and fonts](#art-and-fonts)
- [Responsive behaviour](#responsive-behaviour)
- [Project structure](#project-structure)
- [Palette](#palette)
- [Coding standards](#coding-standards)
- [Verification](#verification)
- [Phase scope and deferred work](#phase-scope-and-deferred-work)

---

## Overview

Phase 3 adds a second screen without disturbing the working Phase 2 loading screen. `WelcomeScene` is registered alongside `BootScene` and `LoadingScene`; the existing `startNextScene()` handoff now finds a real scene and starts it after the loading fade-out. No loading-screen visuals, progress logic or audio behaviour were changed — only two additional assets were added to its preload queue so the new screen needs no second loading phase.

The Welcome Screen recreates the supplied reference as **separate layered game assets**: a new temple-courtyard plate, moon / side glows, a drifting cloud bank, the exact same Kenji and Shadow cutouts, the established `FIGHTER'S ARENA` wordmark, falling petals, rising embers, five arcade buttons, a bottom tagline and two top-right HUD badges.

---

## Technology stack

| Concern      | Choice                                               | Installed version                   |
| ------------ | ---------------------------------------------------- | ----------------------------------- |
| Game engine  | Phaser **3**                                         | `phaser@3.90.0`                     |
| Language     | TypeScript (strict)                                  | `typescript@5.9.3`                  |
| Rendering    | HTML5 Canvas / WebGL (`Phaser.AUTO`)                 | —                                   |
| Build tool   | Vite                                                 | `vite@7.3.7`                        |
| Audio        | Web Audio API via Phaser Audio, HTML5 Audio fallback | Phaser built-in                     |
| Code quality | ESLint (flat config) + Prettier                      | `eslint@10.14.0`, `prettier@3.9.10` |
| Art / audio  | Pillow / NumPy / SciPy pipelines (offline)           | not a runtime dependency            |

**Runtime dependency:** `phaser` only. Node `^20.19.0 || >=22.12.0` and npm 10+ are required to build. No new packages were added in Phase 3.

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

Both servers bind to `0.0.0.0` and accept proxied host headers, so the app also works in remote preview environments.

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

## Screen design

Everything is a separate object at an explicit depth (`src/constants/welcome.ts`), expressed as fractions of the fixed `640 × 360` resolution.

| Layer (depth)               | Component      | Contents                                                                                     |
| --------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| Courtyard (0)               | `WelcomeStage` | Original temple-courtyard plate: moon, pagodas, lantern-lit buildings, blossoms, stone floor |
| Moon / side glows (1–2)     | `WelcomeStage` | Runtime radial glow textures, pulsing warm halo, orange left / violet right light            |
| Cloud bank (3)              | `WelcomeStage` | One slow drifting cloud for gentle atmospheric movement                                      |
| Fighters (8)                | `WelcomeStage` | Kenji (red, left) and Shadow (purple, right) — identical Phase 2 plates, integer-pixel idle  |
| Logo (10)                   | `WelcomeStage` | `FIGHTER'S ARENA` wordmark, subtle entrance and float, no menu overlap                       |
| Petals / embers (12)        | `WelcomeStage` | 22 slow falling blossoms, 14 rising embers, deterministic PRNG                               |
| Menu / tagline (20)         | `MenuPanel`    | Five arcade buttons, keyboard selection, `FIGHT. WIN. BE LEGEND.` banner                     |
| Corner HUD (24)             | `CornerHud`    | Two gold hexagonal volume / fullscreen badges, **visual only**                               |
| Popup dim / panel (100–101) | `ModalPopup`   | Scrim, octagonal panel, entrance / exit tweens                                               |

All sprites use `pixelArt: true`, `antialias: false`, `roundPixels: true` and CSS `image-rendering: pixelated`. Panel and button bodies use crisp horizontal pixel tones rather than smooth gradients — a fan-triangled polygon gradient leaves a visible diagonal seam in Phaser's WebGL renderer.

---

## Menu and buttons

`ArcadeButton` is a reusable component with `primary` / `dark` / `compact` variants: sharp octagonal metallic frames, layered borders, real pixel-art icons, an additive orange glow, and smoothed hover / selection / press states.

| Button      | Icon   | Behaviour in this phase                                     |
| ----------- | ------ | ----------------------------------------------------------- |
| PLAY        | play   | Primary orange button with a pulsing glow; **display only** |
| SETTINGS    | gear   | Opens the mobile-only Settings popup                        |
| LEADERBOARD | trophy | Hover / press feedback only; **no navigation**              |
| ABOUT       | info   | Opens the About popup                                       |
| QUIT        | exit   | Hover / press feedback only; **no exit action**             |

Icons come from a 7-frame `24 × 24` pixel sheet (`public/assets/ui/menu_icons.png`) authored in `assets_work/process_welcome_assets.py` — no font glyphs, emoji or plain text symbols. The PLAY button is selected by default; pointer and keyboard (`↑`/`↓`/`W`/`S`, `Enter`/`Space`) both drive selection.

The two top-right badges deliberately have no input handling, so they cannot imply unfinished audio or fullscreen features.

---

## Popups

`ModalPopup` is one reusable shell used by both popups. It provides background dimming, an orange / purple accented octagonal frame, a `Back.easeOut` entrance, a `Sine.easeIn` exit, outside-click dismissal, Escape dismissal and a CLOSE button. Subclasses only build their content.

**About popup** — title `ABOUT FIGHTER'S ARENA`, the required short description, a small game logo, `FIGHTER'S ARENA · VERSION 1.0.0`, and a clean CLOSE button. It is a popup, not a page or scene.

**Settings popup** — exactly three mobile-preparation options:

| Option               | Control            | Values                 |
| -------------------- | ------------------ | ---------------------- |
| Mobile Controls      | `ToggleSwitch`     | SHOW / HIDE            |
| Left-Handed Controls | `ToggleSwitch`     | ON / OFF               |
| Touch Control Size   | `SegmentedControl` | SMALL / MEDIUM / LARGE |

No audio, graphics, language, difficulty or other settings exist, and no touch controls are implemented.

---

## Mobile settings persistence

`src/game/settings/mobileSettings.ts` owns a validated `localStorage` record:

- Key: `fighters-arena:mobile-settings:v1`
- Defaults: `showMobileControls: true`, `leftHanded: false`, `touchControlSize: 'medium'`
- Values are sanitised on read, so malformed / stale JSON falls back safely; storage failures never break the menu.
- Changes are saved immediately and published to the game registry plus `GAME_EVENTS.MOBILE_SETTINGS_CHANGED` for future phases.

`WelcomeScene.init()` loads them, so preferences survive a reload. This is preparation only — the values are not consumed by any gameplay yet.

---

## Audio continuity

Nothing about audio changed in Phase 3. `AudioManager` is a game-level singleton attached in `BootScene`; the theme is decoded before the loading screen and started at real 70% progress with a `0 → 0.55` fade-in. `LoadingScene` shuts down and `WelcomeScene` starts, but the sound object lives on, so music never restarts and flows into the menu (and will flow into later screens). The first-valid-interaction `AudioUnlock` remains active.

Phase 3 added two image assets to `LoadingScene.preload()` (courtyard + icon sheet, 12 files total), so all required assets are ready at 100% and the Welcome Screen appears immediately without a blank second loading phase. With 12 files, the first real progress event at or above 70% is `0.75`; the trigger remains tied to real loader progress and fires before 100%.

---

## Art and fonts

`assets_work/` holds the offline source art and reproducible pipelines; only finished, downsampled plates are committed under `public/assets/`.

- `welcome_courtyard.png` — original Phase 3 source plate.
- `process_welcome_assets.py` — nearest-neighbour downsampling to `640 × 360`, gentle palette grading, the 7-frame pixel icon sheet, and layout / icon inspection previews.
- `process_assets.py` / `compose_theme.py` — unchanged Phase 2 pipelines.
- `assets_work/audio_work/` and `assets_work/preview/` — generated working output (WAV master, previews, browser verification screenshots), gitignored.

Self-hosted fonts (all SIL OFL, licenses included): **Anton** for the loading HUD, **Rajdhani** 600/700 for menu labels and body copy, **Oxanium** 600/700 for popup titles and small technical labels. All five faces are registered through the FontFace API before Phaser boots. The display font is intentionally arcade-inspired, not generic web typography.

No personal watermark or credit appears anywhere in the project.

---

## Responsive behaviour

| Requirement         | Implementation                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Internal resolution | `640 × 360` fixed; target display `1280 × 720` (exact 2×)                                  |
| Landscape scaling   | CSS 16:9 stage capped at `1280 × 720` + Phaser `Scale.FIT` / `CENTER_BOTH`                 |
| Portrait            | `@media (orientation: portrait)` hides the game stage and shows the `#rotate-notice` panel |
| Popups              | Authored inside the fixed `640 × 360` canvas, so they scale proportionally with the scene  |
| Pixel integrity     | `pixelArt`, `antialias: false`, `roundPixels`, `image-rendering: pixelated`                |
| 60 FPS target       | Lightweight per-frame transforms only; no tween chains accumulate                          |

Verified at `1920×1080`, `1024×768`, `1024×600`, `667×375` (landscape, including the About popup) and `390×844` (portrait). Canvas aspect ratio stayed `16:9` on every landscape size.

---

## Project structure

```
Fighters_Arena/
├── index.html                          # #game-root stage + portrait rotate notice
├── assets_work/                        # Offline art/audio source + reproducible pipelines
├── public/assets/
│   ├── arenas/backgrounds/             # arena_night, welcome_courtyard, clouds, flames
│   ├── characters/spritesheets/        # kenji, shadow
│   ├── ui/                             # logo, menu_icons, glow, petal, ember
│   ├── fonts/                          # Anton / Rajdhani / Oxanium + licenses
│   └── audio/music/                    # theme_main.ogg / .mp3
└── src/
    ├── main.ts                         # Font load -> Phaser.Game -> DEV debug bridge
    ├── styles/main.css                 # 16:9 stage, pixelated canvas, rotate notice
    ├── constants/                      # game, palette, assets, scenes, loading, welcome
    ├── types/                          # audio, loading, welcome
    ├── utils/                          # math, fonts, runtime textures, shapes, debugBridge
    └── game/
        ├── config/gameConfig.ts        # Engine-level config (no scenes inline)
        ├── config/sceneRegistry.ts     # [BootScene, LoadingScene, WelcomeScene]
        ├── config/gameFlow.ts          # Guarded handoff to the next screen
        ├── scenes/                     # BootScene, LoadingScene, WelcomeScene
        ├── audio/                      # AudioManager, AudioUnlock, audioKeys
        ├── settings/mobileSettings.ts  # Validated localStorage preferences
        └── ui/
            ├── Loading*                # Phase 2 loading components (unchanged)
            ├── WelcomeStage.ts         # Layered background, fighters, logo, particles
            ├── ArcadeButton.ts         # Reusable sharp-cornered button
            ├── MenuPanel.ts            # Five buttons, keyboard selection, tagline
            ├── CornerHud.ts            # Visual-only volume / fullscreen badges
            ├── ModalPopup.ts           # Reusable popup shell
            ├── AboutPopup.ts           # About content
            ├── SettingsPopup.ts        # Mobile-only settings content
            ├── ToggleSwitch.ts         # ON/OFF switch
            └── SegmentedControl.ts     # Small / Medium / Large selector
```

`sceneRegistry.ts` is the single place where new screens are registered; `gameConfig.ts` never changes for content phases.

---

## Palette

| Token       | Hex       | Role                         |
| ----------- | --------- | ---------------------------- |
| Orange      | `#FF5A00` | Primary accent / PLAY fill   |
| Deep Orange | `#D93600` | Primary shadow               |
| Purple      | `#8B2BE2` | Secondary accent             |
| Deep Purple | `#4B176F` | Popup border / shadow        |
| Background  | `#101014` | Canvas / vignette            |
| Panel       | `#1B1B22` | UI panels                    |
| White       | `#FFFFFF` | Text                         |
| Gold        | `#FFC247` | Borders / highlights / icons |

Defined in `src/constants/palette.ts` as CSS strings and numeric Phaser hex values.

---

## Coding standards

- Strict TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `@/` alias for cross-feature imports; relative imports inside a feature.
- `import type` for type-only imports, `as const` for constant tables, explicit return types on public APIs.
- Constants in `src/constants/`, pure logic in `src/utils/`, scene owns the action contract, visuals in `src/game/ui/`.
- Loading logic, audio, settings storage, popup shell and visual components are separate modules — no giant single-file scene.

---

## Verification

Run on the Vite dev server with headless Chromium (WebGL via SwiftShader):

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` — all pass.
- **Transition:** loading reaches 100% with 12/12 files and `loadErrors: 0`; `nextSceneStarted: true`; `activeScenes` becomes exactly `['Welcome']`; one `welcome-ready` event.
- **Loading screen preserved:** mid-cycle screenshot at 53% reviewed — unchanged visuals and behaviour.
- **Fonts:** all five self-hosted faces confirmed loaded via `document.fonts.check`.
- **Buttons:** hover reported for all five buttons; PLAY / LEADERBOARD / QUIT each registered a press with no navigation and no popup; glow visible on hover.
- **About popup:** opens with the exact required title, description, game name, version `1.0.0`, small logo and CLOSE; closes via CLOSE, outside click and Escape (all three reasons recorded).
- **Settings popup:** opens with SHOW / OFF / MEDIUM; toggles to HIDE / ON / LARGE; saves to `localStorage` and the registry; reopening reloads the saved values; values persist across a page reload.
- **Keyboard:** ArrowDown / ArrowUp move selection; Space / Enter activate.
- **Audio:** `musicState: playing`, `volume 0.55`, exactly one active sound, and an unchanged `startedAtMs` from the moment the Welcome Screen appeared through all interactions — no restart.
- **Responsive:** `1280×720`, `1024×576`, `666×374` stages all kept 16:9 undistorted; the About popup remained fully visible and readable at `667×375`; portrait `390×844` showed `ROTATE YOUR DEVICE`.
- **Console / assets:** no console errors, page errors, failed requests or HTTP 4xx/5xx in any scenario.

Headless Chromium runs with muted audio output, so **audible playback was not verified**. Autoplay behaviour varies by browser; the first-interaction unlock remains implemented and was verified in Phase 2 with a simulated blocked context. Testing used headless viewport emulation, not physical devices.

---

## Phase scope and deferred work

**Included in Phase 3:** layered temple-courtyard Welcome Screen, five-button arcade menu with icons and hover / press / selection states, About popup, mobile-only Settings popup with local persistence, visual-only corner badges, tagline, keyboard navigation, entrance / exit animations, and the loading → welcome transition. Phase 1 setup and Phase 2 loading screen remain intact.

**Explicitly deferred:** character selection, game mode and arena selection, leaderboard functionality, actual quit behaviour, fighting mechanics, gameplay, other screens, audio / graphics / language / difficulty settings, and real mobile touch controls.

---

## License

`UNLICENSED` — private project; licensing will be decided before distribution. The bundled Anton, Rajdhani and Oxanium fonts are distributed under their own included licenses.
