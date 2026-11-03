# FIGHTER'S ARENA

**Phase 5 — Character Selection + existing bug fixes**

A browser-based, 2D side-view fighting game built around **Modern HD Pixel Art**, developed one phase at a time.

> **Current scope:** the loading screen, the Welcome Screen / Main Menu (About, mobile-preparation Settings and QUIT popups), the Game Mode Selection Screen and the **Character Selection Screen**. Mode cards and character cards are visual selection only. There is no arena selection, game mode implementation, fighting mechanics, gameplay, tournament system, multiplayer or survival logic.
>
> Flow: `Welcome → Game Mode Selection → Character Selection`. The Back button on Character Selection returns to Game Mode Selection. LEADERBOARD remains display-only.

---

## Contents

- [What Phase 5 fixed](#what-phase-5-fixed)
- [Character Selection screen](#character-selection-screen)
- [Roster and statistics](#roster-and-statistics)
- [Architecture](#architecture)
- [Shared systems](#shared-systems)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Typography and icons](#typography-and-icons)
- [Art pipeline](#art-pipeline)
- [Rendering and responsive behaviour](#rendering-and-responsive-behaviour)
- [Verification](#verification)
- [Phase scope and deferred work](#phase-scope-and-deferred-work)

---

## What Phase 5 fixed

Four previously non-functional / incorrect features were rebuilt as real systems rather than visual-only stubs.

### QUIT

Clicking QUIT now opens a `QuitPopup` (built on the shared `ModalPopup` shell) with the exact message `ARE YOU SURE YOU WANT TO QUIT?` and YES / CANCEL buttons. CANCEL dismisses and returns to the Welcome Screen.

YES is handled by the game-level `QuitController`. Modern browsers only permit `window.close()` on windows opened by script, so the controller:

1. calls `window.close()` only in a permitted context (`window.opener` present or an explicit host opt-in),
2. waits and **verifies** `window.closed` instead of assuming success,
3. when the tab is still open, replaces the popup content with an honest fallback: `YOUR BROWSER BLOCKED AUTOMATIC CLOSING. PLEASE CLOSE THIS TAB MANUALLY TO EXIT FIGHTER'S ARENA.` plus a CLOSE button.

The player is never left on a blank screen and the game never claims a close that did not happen. Escape / outside-click also dismiss the popup.

### Volume

The top-right volume badge is now a real control on every screen, wired to the single `AudioManager` instance:

- click toggles mute; the Lucide icon swaps immediately between `volume-2` (sound on) and `volume-x` (muted),
- the master gain is set to `0` while muted and restored to `AUDIO_CONFIG.MASTER_VOLUME` when unmuted, so **music and every SFX** are affected,
- `playSfx()` short-circuits while muted, so no silent sound instances accumulate,
- the preference is validated and persisted in `localStorage` under `fighters-arena:audio:v1` and restored on the next boot,
- music is never restarted or duplicated by a mute toggle or a scene change (`startedAtMs` stays fixed, one active sound).

### Fullscreen

The top-right badge is wired to the single `FullscreenManager`:

- requests are made from the real pointer-up gesture, on `document.documentElement` (never the canvas), so the 16:9 CSS stage stays letterboxed and artwork is never stretched,
- clicking again exits fullscreen (`minimize` icon while active, `maximize` otherwise),
- `fullscreenchange` / `webkitfullscreenchange` keep the state and icon synchronised with browser-driven exits (Esc, F11),
- unsupported browsers dim the badge and disable its handler; rejected requests are caught and recorded instead of throwing into the game loop,
- Phaser's FIT scaling is re-measured after the viewport changes.

### Rotate Your Device

The CSS-only portrait guard was replaced by a real viewport-driven `OrientationManager` plus a redesigned overlay:

- orientation is computed from **actual viewport dimensions** (`visualViewport` → `innerWidth/innerHeight`), never from a user agent or device guess;
- `resize`, `orientationchange`, `visualViewport.resize` and the orientation media query are all observed;
- portrait shows a centered gaming-style phone illustration with a rotating animation, a curved arrow, orange/purple glows, the heading `ROTATE YOUR DEVICE` and the description `PLEASE ROTATE YOUR PHONE TO LANDSCAPE MODE TO PLAY FIGHTER'S ARENA.`;
- landscape hides the overlay (`display:none`, `pointer-events:none`) and re-measures FIT scaling;
- **no scene is ever reloaded** — the DOM attribute changes only, so loading, music and menu state survive rotation;
- `prefers-reduced-motion` disables the animation and shows the phone already rotated.

---

## Character Selection screen

A real interactive screen recreating the reference composition while keeping the established visual identity: the same moonlit Japanese temple courtyard plate, glowing moon, pagodas, cherry blossoms, purple clouds, stone floor, lantern light and drifting petals (shared `CourtyardStage`), darkened slightly so the UI reads clearly.

- **Header:** `SELECT CHARACTER` in the shared orange-accented arcade frame.
- **Top-left:** functional Back (returns to Game Mode Selection).
- **Top-right:** the shared functional volume / fullscreen badges.
- **Left:** large full-body artwork, name, fighting style and four clean animated statistics bars.
- **Centre:** seven card plates in a balanced 4 + 3 grid, each with a bust portrait, unique colour theme, consistent cut-corner border, name, hover feedback and an orange selected glow with a `P1` tag.
- **Right:** RANDOM mystery pick — hooded silhouette, purple SVG question mark, `shuffle` icon and `RANDOM` label.
- **Bottom:** information bar with the default `CHOOSE YOUR FIGHTER`; selecting a fighter shows that fighter's short description.

Selection works with mouse, touch and keyboard (arrows, Enter/Space, Escape/Backspace). A selection immediately updates the highlighted card, large artwork, name, style, statistics and information copy with a short frame-rate-independent easing. The default fighter is **Kenji**. RANDOM picks only from unlocked fighters and avoids repeating the current pick. State lives in the game-level `CharacterSelection` manager, so it survives a Back → forward round trip.

No CONTINUE button, arena selection or gameplay exists.

---

## Roster and statistics

All values live in `src/constants/characters.ts` — the UI never hardcodes a stat.

| Fighter   | Style                      | Power | Speed | Defense | Range |
| --------- | -------------------------- | ----- | ----- | ------- | ----- |
| KENJI     | Blazing Fist / Karate      | 0.78  | 0.90  | 0.60    | 0.55  |
| SHADOW    | Shadow Arts / Ninjutsu     | 0.62  | 0.96  | 0.52    | 0.78  |
| BLAZE     | Phoenix Flame / Striking   | 0.84  | 0.82  | 0.58    | 0.70  |
| IRON FIST | Iron Guard / Brawling      | 0.94  | 0.48  | 0.92    | 0.42  |
| STORM     | Thunder Style / Kickboxing | 0.70  | 0.88  | 0.62    | 0.80  |
| RAVEN     | Blade Dance / Kenjutsu     | 0.74  | 0.86  | 0.56    | 0.94  |
| TITAN     | Earthbreaker / Grappling   | 0.98  | 0.42  | 0.88    | 0.48  |

All seven are currently unlocked. Kenji and Shadow keep their exact Phase 2 designs.

---

## Architecture

| Concern                                | File                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Roster, stats, layout, palette accents | `src/constants/characters.ts`                                                                    |
| Shared HUD geometry                    | `src/constants/hud.ts`                                                                           |
| Scene keys, events, registry keys      | `src/constants/scenes.ts`                                                                        |
| Character / system types               | `src/types/characters.ts`, `src/types/system.ts`, `src/types/stage.ts`                           |
| Character selection state              | `src/game/characters/CharacterSelection.ts`                                                      |
| Audio service + mute preference        | `src/game/audio/AudioManager.ts`, `audioPreferences.ts`                                          |
| Fullscreen service                     | `src/game/config/FullscreenManager.ts`                                                           |
| Orientation service                    | `src/game/config/OrientationManager.ts`                                                          |
| QUIT flow                              | `src/game/config/QuitController.ts`                                                              |
| Scenes                                 | `src/game/scenes/{Boot,Loading,Welcome,GameMode,Character}Scene.ts`                              |
| Single scene registration point        | `src/game/config/sceneRegistry.ts`                                                               |
| Shared courtyard / header / info bar   | `src/game/ui/{CourtyardStage,ScreenHeader,InfoBar}.ts`                                           |
| Shared system HUD                      | `src/game/ui/GameHud.ts`                                                                         |
| Character views                        | `src/game/ui/{CharacterCard,CharacterShowcase,RandomOption,CharacterHeader,CharacterInfoBar}.ts` |
| Popups                                 | `src/game/ui/{ModalPopup,AboutPopup,SettingsPopup,QuitPopup}.ts`                                 |
| DEV inspection bridge                  | `src/utils/debugBridge.ts`                                                                       |

`ModalPopup` now owns a `content` child container, so a popup can rebuild its body (used by the QUIT fallback) without duplicating the frame. `ModeHeader`/`ModeInfoBar` and `CharacterHeader`/`CharacterInfoBar` are thin presets over the shared components — no duplicated drawing code.

---

## Shared systems

`main.ts` attaches these singletons once; every screen uses the same instance, so there is exactly one audio manager, one fullscreen controller, one orientation controller, one quit controller and one character selection state.

| System               | Snapshot key               | Event                    |
| -------------------- | -------------------------- | ------------------------ |
| `AudioManager`       | `fa:audio-state`           | `fa:audio-changed`       |
| `FullscreenManager`  | `fa:fullscreen-state`      | `fa:fullscreen-changed`  |
| `OrientationManager` | `fa:orientation-state`     | `fa:orientation-changed` |
| `QuitController`     | `fa:quit-state`            | `fa:quit-changed`        |
| `CharacterSelection` | `fa:character-state`       | `fa:character-changed`   |
| Character scene      | `fa:character-scene-state` | `fa:character-ready`     |

The loading screen queues assets through counting helpers, so the honest `loadedFiles / totalFiles` indicator can never drift from the real loader queue (**46 files** in Phase 5).

---

## Technology stack

| Concern      | Choice                                     | Installed version                   |
| ------------ | ------------------------------------------ | ----------------------------------- |
| Game engine  | Phaser **3**                               | `phaser@3.90.0`                     |
| Language     | TypeScript (strict)                        | `typescript@5.9.3`                  |
| Rendering    | HTML5 Canvas / WebGL (`Phaser.AUTO`)       | —                                   |
| Build tool   | Vite                                       | `vite@7.3.7`                        |
| Code quality | ESLint (flat) + Prettier                   | `eslint@10.14.0`, `prettier@3.9.10` |
| Icons        | Lucide SVG (vendored, ISC)                 | no runtime dependency               |
| Art / audio  | Pillow / NumPy / SciPy pipelines (offline) | not a runtime dependency            |

**Runtime dependency:** `phaser` only. Node `^20.19.0 || >=22.12.0` and npm 10+ are required to build. **No new npm packages were added in Phase 5.**

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

## Typography and icons

| Face     | Weight    | Role                                     |
| -------- | --------- | ---------------------------------------- |
| Anton    | 400       | Loading percentage, large character name |
| Oxanium  | 700 / 600 | Display headings, info bars              |
| Rajdhani | 700 / 600 | Menu labels, card names, stat labels     |

All five faces are self-hosted official `@fontsource` WOFF2 files (SIL OFL) under `public/assets/fonts/`, preloaded in `index.html`, forced through `document.fonts.load()` and awaited with `document.fonts.ready` **before** `new Phaser.Game()`. Every Phaser Text uses `resolution: 2` through `addUiText()`.

**16 Lucide SVGs** (ISC) are vendored in `public/assets/ui/icons/`, rasterised once by Phaser at 64×64 with linear filtering. Phase 5 adds `volume-x`, `minimize`, `shuffle` and `circle-help`. No emoji, Unicode symbols, text-glyph icons or low-resolution raster icon sheets are used as interface icons.

---

## Art pipeline

`assets_work/process_character_assets.py` is the reproducible offline pipeline:

1. Chroma-keys the flat `#00FF00` field from each original illustration with a despill and soft alpha edge.
2. Crops a head-and-shoulders bust, cover-fits it into a 2×-authored cut-corner card plate with a themed gradient, accent glow, sparse pixel streaks and a dark caption band.
3. Fits the full-body cutout into a 360×400 (2× of 180×200) transparent showcase plate.
4. Produces the transparent RANDOM silhouette and a contact sheet for review.

Outputs: `public/assets/characters/cards/card_<id>.png` (128×152), `public/assets/characters/showcase/show_<id>.png` (360×400) and `public/assets/characters/random_silhouette.png` (300×380). Nothing is stretched — every fit is contain/cover with a locked aspect ratio.

```bash
/tmp/fa-venv/bin/python assets_work/process_character_assets.py
```

---

## Rendering and responsive behaviour

- Framebuffer `1280 × 720` (`RENDER_SCALE = 2`); every scene uses an integer camera zoom of 2 centred on `(320, 180)`, so all game code stays in the `640 × 360` logical space.
- CSS stage is capped at `1280 × 720` with `image-rendering: auto`; the canvas is shown 1:1 or smoothly reduced, never magnified.
- Landscape-only: desktop `1920×1080`, laptop `1024×768`, tablet `1024×600`, mobile `667×375` / `844×390` all keep a 16:9 stage (Phaser's `autoRound` may round the canvas CSS by ±1px on fractional sizes).
- Portrait shows the redesigned overlay and hides the stage; returning to landscape re-measures FIT scaling without a scene reload.
- Fullscreen letterboxes the stage on `document.documentElement` and never stretches the canvas.

---

## Verification

`npm run format:check`, `npm run lint`, `npm run typecheck` and `npm run build` all pass. A headless Chromium suite (`/tmp/fa-browser/p5_verify.mjs`, **245/245 checks**) covers:

- **Fixed functionality:** QUIT confirmation, CANCEL, YES fallback, a simulated permitted `window.close()` attempt, volume mute/unmute, icon swaps, localStorage persistence across reload, muted SFX suppression, fullscreen enter/exit, browser-driven exit sync, rejected requests and unsupported browsers, portrait overlay at phone/tablet sizes with exact copy and animation, landscape recovery with no scene reload.
- **New screen:** Welcome → Mode Select → Character Select, seven card selections with exact names/statistics/artwork textures, one highlighted card at a time, RANDOM over ten picks, keyboard navigation, Back, default `CHOOSE YOUR FIGHTER` copy and the selected-fighter description.
- **Regression:** 46/46 loading files with zero errors, all five fonts, `1280×720` framebuffer, zoom 2, `worldView [0,0,640,360]`, 16 icon textures at ≥64px, all Text at resolution 2, About/Settings popups and preference persistence, one active music sound with an unchanged start timestamp across all transitions, 216 asset responses all 2xx, zero console/page/request errors.

A production preview (`vite preview`) was also verified: the built bundle contains all character art, all 16 SVG icons and all five font preloads, with `debugBridge` absent in production.

### Not proven by these tests

- Headless Chromium is muted, so **audible** playback is never proven; the Web Audio gain node, context state and sound-instance count are verified programmatically.
- SwiftShader runs at roughly 10 FPS, so the **60 FPS target** is not benchmarked on real hardware and tween wall-clock timings are stretched in that environment.
- Orientation and responsive results come from viewport emulation, not physical devices.
- `window.close()` was stubbed/simulated in the automated run; a real tab closing cannot be observed from inside the same page. The browser-blocked fallback is the verified real-world path.
- Fullscreen capability removal mid-session is a simulated condition; real browsers do not change capability at runtime.

---

## Phase scope and deferred work

Deliberately **not** implemented: arena selection, implemented game modes, fighting mechanics/gameplay, player movement, combat AI, health bars, matchmaking, tournament/multiplayer/survival systems, extra settings, a CONTINUE button, and any personal watermark/credit.

The next phase starts only on a new instruction.
