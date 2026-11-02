# FIGHTER'S ARENA

**Phase 4 — Game Mode Selection Screen**

A browser-based, 2D side-view fighting game built around **Modern HD Pixel Art**, developed one phase at a time.

> **Current scope:** the loading screen, the Welcome Screen / Main Menu (About and mobile-preparation Settings popups), and the **Game Mode Selection Screen**. Mode cards are **visual selection only**. There is no character selection, arena selection, game mode implementation, fighting mechanics, gameplay, tournament system, multiplayer or survival logic. PLAY navigates to Game Mode Selection; the Back button returns to Welcome. LEADERBOARD and QUIT remain display-only.

---

## Contents

- [Overview](#overview)
- [UI quality fix (Phase 4 prerequisite)](#ui-quality-fix-phase-4-prerequisite)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Typography](#typography)
- [Icon system](#icon-system)
- [Game Mode Selection screen](#game-mode-selection-screen)
- [Cards and interactions](#cards-and-interactions)
- [Information bar](#information-bar)
- [Screen transitions and audio](#screen-transitions-and-audio)
- [Art pipeline](#art-pipeline)
- [Responsive behaviour](#responsive-behaviour)
- [Project structure](#project-structure)
- [Palette](#palette)
- [Coding standards](#coding-standards)
- [Verification](#verification)
- [Phase scope and deferred work](#phase-scope-and-deferred-work)

---

## Overview

Phase 4 had two jobs. First, fix the **actual cause** of the blurry, messy UI: every screen was drawing text, icons and vector chrome into a `640 × 360` canvas and then CSS-magnifying it, so a 12px label only ever contained 12px of glyph detail. Second, add the Game Mode Selection screen on top of that corrected pipeline.

The loading and Welcome screens were kept working; their behaviour and composition are unchanged. Only the rendering pipeline, font loading and icon sources were upgraded (plus the one new PLAY navigation path required by this phase).

---

## UI quality fix (Phase 4 prerequisite)

**Root cause, not a cosmetic workaround:** the framebuffer was too small. Increasing font sizes would only have produced larger blurry glyphs.

| Problem                                              | Fix                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `640 × 360` framebuffer CSS-upscaled to `1280 × 720` | Framebuffer is now `1280 × 720` (`RENDER_SCALE = 2`). Every scene calls `configureSceneCamera()`, which applies an **integer camera zoom of 2** and centres on `(320, 180)`, so all game code keeps working in the familiar `640 × 360` logical space while Text, SVG icons and Graphics get full display-resolution pixels. |
| Canvas magnified with `image-rendering: pixelated`   | The CSS stage is capped at `1280 × 720`, so the canvas is now shown **1:1 or smoothly reduced**, never magnified. Pixel-art plates stay crisp because Phaser still doubles them with nearest-neighbour filtering at an integer zoom.                                                                                         |
| Phaser Text rasterised at resolution 1               | `addUiText()` / `uiTextStyle()` set `resolution: 2`, giving a 1:1 texel-to-framebuffer mapping. Verified: every Text object reports `style.resolution === 2`.                                                                                                                                                                |
| Fonts loaded lazily / with wrong weights             | All faces are registered with their true `weight` descriptors, forced through `document.fonts.load()`, awaited with `document.fonts.ready` **before** `new Phaser.Game()`, and preloaded from `index.html`.                                                                                                                  |
| Fonts from a CDN                                     | Self-hosted official `@fontsource` WOFF2 files (Google Fonts, SIL OFL) under `public/assets/fonts/`, with licences included. No runtime CDN dependency.                                                                                                                                                                      |
| Icons drawn as text glyphs / 24px raster sheet       | Vendored **Lucide** SVG files (ISC), rasterised once by Phaser at `64 × 64` with linear filtering. One consistent 24px stroke language across every screen.                                                                                                                                                                  |
| Fractional transforms smearing text                  | Positions are rounded to logical pixels, hover scaling is small (≤3.5%) and applied only after text has full-resolution detail.                                                                                                                                                                                              |
| HTML text hints                                      | `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: optimizeLegibility` on the DOM shell.                                                                                                                                                                                          |

Also improved: wide tracking on headings, stronger stroke/shadow contrast, one shared `addUiText()` entry point, and automatic label fitting so no copy can overflow a card or panel.

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
| Icons        | Lucide SVG (vendored, ISC)                           | no runtime dependency               |
| Art / audio  | Pillow / NumPy / SciPy pipelines (offline)           | not a runtime dependency            |

**Runtime dependency:** `phaser` only. Node `^20.19.0 || >=22.12.0` and npm 10+ are required to build. **No new npm packages were added in Phase 4.**

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

Both servers bind to `0.0.0.0` and accept proxied host headers.

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

## Typography

| Face     | Weight | Role                               |
| -------- | ------ | ---------------------------------- |
| Anton    | 400    | Loading-screen percentage and HUD  |
| Oxanium  | 700    | Popup titles, card titles, headers |
| Oxanium  | 600    | Small technical labels, info bar   |
| Rajdhani | 700    | Menu button labels                 |
| Rajdhani | 600    | Body copy, descriptions            |

Each weight is registered under its own family name because Phaser composes a canvas font as `[fontStyle] [fontSize] [fontFamily]` and has no separate weight field. `src/utils/typography.ts` is the single place where Phaser text is created: it applies `resolution: 2`, integer positioning, sensible defaults and optional `letterSpacing` for wide-tracked arcade headings. `tracked()` is used for the Game Mode header and information bar.

---

## Icon system

`public/assets/ui/icons/` holds 12 vendored Lucide SVGs with their ISC licence:

`arrow-left`, `volume-2`, `maximize`, `play`, `settings`, `trophy`, `info`, `log-out`, `swords`, `users-round`, `shield`, `x`.

`src/utils/icons.ts` owns the mapping (`UI_ICONS`), queues all SVGs during the loading phase, rasterises each at `64 × 64` (4× a typical logical icon), applies linear filtering and exposes `addIcon()` for consistent sizing and tinting. The old `24 × 24` raster `menu_icons.png` sheet was retired and removed from `public/assets/ui/`; no emoji, Unicode glyph or hand-drawn low-resolution icon is used anywhere.

Icons are used consistently for the Welcome menu, Welcome corner badges, Game Mode cards, the back button and the Game Mode corner badges. Hover/selection states change tint only, never the icon shape.

---

## Game Mode Selection screen

Everything is a separate object at an explicit depth (`src/constants/gameModes.ts`), in the fixed `640 × 360` logical space.

| Layer (depth)                 | Component         | Contents                                                                                                                                                       |
| ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Courtyard / scrim (0–1)       | `ModeStage`       | The same Welcome courtyard plate (moon, pagodas, lantern-lit buildings, cherry blossoms, purple clouds, stone arena floor) with a soft scrim for card contrast |
| Glows / clouds / petals (2–5) | `ModeStage`       | Breathing moon halo, warm-left / violet-right light, one drifting cloud bank, 18 falling blossoms                                                              |
| Cards (10–13)                 | `GameModeCard` ×4 | Layered art plate, vector frame, Lucide icon, short description, title plate                                                                                   |
| Header (20)                   | `ModeHeader`      | `SELECT GAME MODE` in a clean orange octagonal frame with two short accent wings                                                                               |
| Info bar (20)                 | `ModeInfoBar`     | Dynamic selected-mode description                                                                                                                              |
| HUD (22)                      | `ModeNav`         | Interactive Back + visual-only volume / fullscreen badges                                                                                                      |

Layout: header centred at `y = 25`; four cards at `x = 104 / 248 / 392 / 536`, `y = 186`, each `134 × 184` with a consistent 10px gap; information bar at `y = 318`. All elements sit inside the visible area with balanced margins.

---

## Cards and interactions

| Card | Artwork                        | Background        | Icon                        | Title       | Short description               |
| ---- | ------------------------------ | ----------------- | --------------------------- | ----------- | ------------------------------- |
| 1    | Kenji (exact Phase 2 cutout)   | Orange / red      | Crossed swords (`swords`)   | BATTLE MODE | Fight in an epic 1v1 battle.    |
| 2    | Shadow (exact Phase 2 cutout)  | Purple            | Trophy (`trophy`)           | TOURNAMENT  | Compete to become the champion. |
| 3    | Original blue fighter          | Blue              | Two players (`users-round`) | VERSUS      | Challenge another player.       |
| 4    | Original mysterious silhouette | Dark red / purple | Shield (`shield`)           | SURVIVAL    | Test your fighting skills.      |

Cards share identical dimensions, gutters, corner cuts, border thickness and typography. Each is a Phaser `Container` with its own hit area, so mouse and touch both work. Hover raises the card by 3.5% with a soft orange halo; selection adds a persistent pulsing orange/gold double border, a small top tab, gold corner diamonds and a subtle 1.5% lift. Other cards stay visually balanced. All state changes are smoothed per frame with `lerp()` — no accumulating tween chains.

`GameModeCard` also fits each label to the card width, so no text ever overlaps the frame (verified: widest card label `110px` inside a `134px` card, zero overflow).

Keyboard: `←` / `→` or `A` / `D` move selection, `Enter` / `Space` re-select, `Escape` / `Backspace` return to Welcome. Key handling deduplicates by native event timestamp because Phaser can re-emit a queued DOM keydown more than once when the frame loop is slow.

**Selection is display-only.** No card starts a screen, character select, arena select or game mode. The volume and fullscreen badges have **no input handlers at all** and are purely visual.

---

## Information bar

The bottom bar shows the exact uppercase copy for the selected mode, updated with a short fade:

| Selected mode | Information bar text                                |
| ------------- | --------------------------------------------------- |
| BATTLE MODE   | `FIGHT IN AN EPIC 1V1 BATTLE.`                      |
| TOURNAMENT    | `COMPETE AGAINST WARRIORS AND BECOME THE CHAMPION.` |
| VERSUS        | `CHALLENGE ANOTHER PLAYER TO A FIGHT.`              |
| SURVIVAL      | `TEST YOUR SKILLS AND SEE HOW LONG YOU CAN LAST.`   |

Battle Mode is selected by default, matching the reference. The bar is centred, has a consistent octagonal orange/gold frame, and shrinks its font if a phrase would ever exceed the available width.

---

## Screen transitions and audio

`WelcomeScene` PLAY fades the camera out over 280ms and starts `GameModeScene`. `GameModeScene`'s Back button (top-left, the only working navigation control) fades out over 260ms and returns to `WelcomeScene`. Both scenes fade in on create, so the handoff is smooth in both directions. Extra clicks during a fade are ignored.

Nothing about audio changed. `AudioManager` is a game-level singleton attached in `BootScene`; the theme is decoded before loading, started at real 70% progress and faded in to `0.55`. Scene starts/stops never touch it, so music flows continuously across Welcome → Game Mode → Welcome without restarting. The first-valid-interaction `AudioUnlock` remains active.

`LoadingScene` now preloads **27 files** (11 Phase 2 images, the Welcome courtyard, 4 card plates and 12 Lucide SVGs), so every later screen is ready at 100% with no second loading phase. With 27 files, the first real progress event at or above 70% is `0.704`; the music trigger remains tied to real loader progress and fires before 100%.

---

## Art pipeline

`assets_work/` holds offline source art and reproducible pipelines; only finished, downsampled plates are committed under `public/assets/`.

- `process_game_mode_assets.py` — new Phase 4 pipeline. Builds four `268 × 368` card plates (2× the `134 × 184` logical card) from a graded arcade backdrop, accent radial glow, sparse pixel streaks, one character illustration, a bottom shade for the caption zone and an octagon cut-corner alpha mask. Crops are **contain-fitted** so artwork is never stretched.
- `versus_fighter.png` / `survival_fighter.png` — original Phase 4 illustrations (blue-clad challenger; mysterious back-turned silhouette).
- `kenji.png` / `shadow.png` — the exact Phase 2 cutouts, reused unchanged.
- `process_assets.py`, `process_welcome_assets.py`, `compose_theme.py` — unchanged Phase 2/3 pipelines. The retired raster icon sheet is now written only to `assets_work/preview/` as an art reference.
- `assets_work/audio_work/` and `assets_work/preview/` — generated working output, gitignored.

No personal watermark or credit appears anywhere in the project.

---

## Responsive behaviour

| Requirement        | Implementation                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Logical resolution | `640 × 360`, rendered at `1280 × 720` via integer zoom                                             |
| Landscape scaling  | CSS 16:9 stage capped at `1280 × 720` + Phaser `Scale.FIT` / `CENTER_BOTH`                         |
| Portrait           | `@media (orientation: portrait)` hides the stage and shows `#rotate-notice`                        |
| Pixel integrity    | `pixelArt`, `antialias: false`, `roundPixels`, nearest-neighbour art doubling, integer camera zoom |
| 60 FPS target      | Lightweight per-frame transforms only; no tween chains accumulate                                  |

Verified at `1920×1080`, `1024×768`, `1024×600`, `667×375` (landscape) and `390×844` (portrait). Canvas aspect ratio stayed 16:9 and no element overlapped or left the visible area at any landscape size.

---

## Project structure

```
Fighters_Arena/
├── index.html                          # #game-root stage, font preloads, rotate notice
├── assets_work/                        # Offline art/audio source + reproducible pipelines
├── public/assets/
│   ├── arenas/backgrounds/             # arena_night, welcome_courtyard, clouds, flames
│   ├── cards/                          # card_battle, card_tournament, card_versus, card_survival
│   ├── characters/spritesheets/        # kenji, shadow
│   ├── ui/icons/                       # 12 Lucide SVGs + LICENSE-Lucide.txt
│   ├── ui/                             # logo, glow, petal, ember
│   ├── fonts/                          # Anton / Rajdhani / Oxanium + licences
│   └── audio/music/                    # theme_main.ogg / .mp3
└── src/
    ├── main.ts                         # Font load -> Phaser.Game -> DEV debug bridge
    ├── styles/main.css                 # 16:9 stage, 1:1-or-smooth canvas, font smoothing
    ├── constants/                      # game, palette, assets, scenes, loading, welcome, gameModes
    ├── types/                          # audio, loading, welcome, gameModes
    ├── utils/                          # camera, typography, icons, fonts, math, shapes,
    │                                   # runtime textures, debugBridge
    └── game/
        ├── config/gameConfig.ts        # Engine-level config (no scenes inline)
        ├── config/sceneRegistry.ts     # [Boot, Loading, Welcome, ModeSelect]
        ├── config/gameFlow.ts          # Guarded handoff to the next screen
        ├── scenes/                     # BootScene, LoadingScene, WelcomeScene, GameModeScene
        ├── audio/                      # AudioManager, AudioUnlock, audioKeys
        ├── settings/mobileSettings.ts  # Validated localStorage preferences
        └── ui/
            ├── Loading*                # Phase 2 loading components
            ├── WelcomeStage, MenuPanel, ArcadeButton, CornerHud, ModalPopup,
            │   AboutPopup, SettingsPopup, ToggleSwitch, SegmentedControl
            └── ModeStage, ModeHeader, ModeNav, ModeInfoBar, GameModeCard
```

`sceneRegistry.ts` is the single place where new screens are registered; `gameConfig.ts` never changes for content phases.

---

## Palette

| Token       | Hex       | Role                         |
| ----------- | --------- | ---------------------------- |
| Orange      | `#FF5A00` | Primary accent / selection   |
| Deep Orange | `#D93600` | Primary shadow               |
| Purple      | `#8B2BE2` | Secondary accent             |
| Deep Purple | `#4B176F` | Panel borders                |
| Background  | `#101014` | Canvas / vignette            |
| Panel       | `#1B1B22` | UI panels                    |
| White       | `#FFFFFF` | Text                         |
| Gold        | `#FFC247` | Borders / highlights / icons |

Supporting card colors (blue `#2A9DFF`, survival red `#FF3B2E`) are accents derived from the same art direction, not extra UI colors.

---

## Coding standards

- Strict TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `@/` alias for cross-feature imports; relative imports inside a feature.
- `import type` for type-only imports, `as const` for constant tables, explicit return types on public APIs.
- Constants in `src/constants/`, pure logic in `src/utils/`, scenes own composition and the action contract, visuals in `src/game/ui/`.
- Loading logic, audio, settings storage, popup shell, typography, icons and visual components are separate modules — no giant single-file scene.

---

## Verification

Run on the Vite dev server with headless Chromium (WebGL via SwiftShader):

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` — all pass.
- **Rendering fix:** canvas backing `1280 × 720` shown 1:1, camera zoom `2`, `worldView` exactly `[0, 0, 640, 360]`; all five fonts loaded with their real weights; every Phaser Text reports `resolution = 2`; 12 Lucide textures at `64 × 64`; no emoji / raster icon sheet in use. Zoomed crops confirm sharp glyphs and icon strokes.
- **Previous screens:** loading still reaches 27/27 files with `loadErrors: 0` and a mid-cycle screenshot reviewed; About closes by CLOSE, outside click and Escape (all three reasons verified); Settings toggles change `SHOW→HIDE`, `OFF→ON`, `MEDIUM→LARGE`, save to `localStorage` and registry, reopen with the saved values and survive a page reload; Welcome keyboard navigation still works.
- **Transition:** PLAY produces `activeScenes: ['ModeSelect']` with one `mode-ready` event; Back button and Escape both return to `['Welcome']`.
- **Cards:** hover reported for all four cards; each click selects exactly one card and the information bar shows the exact required uppercase string; `pressCounts` 1/1/1/1; no navigation to unfinished screens; clicking the volume badge does nothing.
- **Alignment:** four cards at `x = 104/248/392/536`, all `134 × 184`, all icons `20` logical px, widest card label `110` inside `134`, zero text overflow.
- **Keyboard:** `←`/`→` move selection one card at a time; `Escape`/`Backspace` go back.
- **Audio:** `playing` at `0.55`, exactly one active sound and an **unchanged `startedAtMs`** from the Welcome screen through every transition and interaction — no restart.
- **Responsive:** `1280×720`, `1024×576`, `666×374` stages all kept 16:9 undistorted; mobile landscape `667×375` screenshot reviewed with all elements visible and readable; portrait `390×844` shows `ROTATE YOUR DEVICE`.
- **Console / assets:** 66 asset responses all `2xx`; no console errors, page errors, failed requests or HTTP 4xx/5xx.

Headless Chromium renders with SwiftShader at roughly 10 FPS and mutes audio, so **60 FPS and audible playback were not proven**; Phaser clamps delta at low frame rates, which stretches wall-clock tween durations and made automated checks poll for state instead of sleeping. Autoplay behaviour varies by browser; the first-interaction unlock remains implemented and was verified in Phase 2 with a simulated blocked context. Testing used headless viewport emulation, not physical devices.

---

## Phase scope and deferred work

**Included in Phase 4:** the UI quality fix (high-DPI framebuffer, supersampled text, self-hosted fonts, Lucide SVG icons), the layered Game Mode Selection screen, four mode cards with hover/selection states, the dynamic information bar, Back navigation, the Welcome → Game Mode transition and visual-only volume/fullscreen badges. Phases 1–3 remain intact.

**Explicitly deferred:** character selection, arena selection, actual game modes, tournament brackets, multiplayer, survival mechanics, fighting mechanics, gameplay, functional volume/fullscreen controls and any other screen.

---

## License

`UNLICENSED` — private project; licensing will be decided before distribution. Bundled Anton / Rajdhani / Oxanium fonts are SIL OFL and Lucide icons are ISC; their licences are included alongside the assets.
