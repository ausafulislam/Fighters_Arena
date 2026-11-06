# FIGHTER'S ARENA

**Phase 6 — Arena Selection through playable fighting gameplay**

A browser-based, 2D side-view arcade fighting game built around **Modern HD Pixel Art**, developed one phase at a time with Phaser 3, TypeScript and Vite.

> **Current scope:** Loading → Welcome / Main Menu → Game Mode Selection → Character Selection → **Arena Selection → Arena Preview → VS Intro → playable match**. All five arenas and all seven fighters are playable. There is no advanced results screen, leaderboard, tournament system, multiplayer implementation or survival mode.

---

## Contents

- [Development flow](#development-flow)
- [Screens](#screens)
- [Playable match](#playable-match)
- [Controls](#controls)
- [Modular architecture](#modular-architecture)
- [Assets and art pipeline](#assets-and-art-pipeline)
- [Audio](#audio)
- [Shared systems](#shared-systems)
- [Rendering and responsive behaviour](#rendering-and-responsive-behaviour)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Verification](#verification)
- [Known limitations and deferred work](#known-limitations-and-deferred-work)

---

## Development flow

```
Boot → Loading → Welcome → Game Mode Selection → Character Selection
     → Arena Selection → Arena Preview → VS Intro → Gameplay
```

`MatchSetup`, `CharacterSelection` and `ArenaSelection` are game-level singletons attached once in `src/main.ts`. The selected mode, player, opponent and arena therefore survive every scene transition without being copied into scene data. Back buttons walk the same chain in reverse:

- Arena Preview → Arena Selection
- Arena Selection → Character Selection
- Character Selection → Game Mode Selection
- Game Mode Selection → Welcome

Kenji vs Shadow in Temple Grounds is the default match; any other fighter still faces Shadow, and any locked-in arena is used as the actual gameplay background.

## Screens

### Arena Selection

`ArenaScene` — `SELECT ARENA` header, five consistent 108 × 146 cut-corner cards (Temple Grounds, Blazing Canyon, Bamboo Forest, Frozen Peak, Skyline Rooftop), real mouse/touch selection, Left/Right arrow buttons, orange selection glow, a dynamic bottom information bar and a working CONFIRM. Default: Temple Grounds. Back returns to Character Selection.

### Arena Preview

`ArenaPreviewScene` — `ARENA PREVIEW` header, a large 320 × 180 live preview of the **selected** arena, left summary panel (thumbnail, name, category, description), right `ARENA FEATURES` panel, working PREVIOUS / NEXT, a prominent CONFIRM and the exact `LOCK IN YOUR ARENA` line. Changing the arena updates every panel immediately; the preview texture is set before its alpha cross-fade so rapid clicks can never leave a stale image.

### VS Intro

`VsIntroScene` — selected arena backdrop, player and opponent artwork sliding in from the sides, portraits, names, orange/purple health previews, a cinematic `VS` landing, then `READY` and `FIGHT!`. The sequence is fully automatic (no clicks required) and hands off to Gameplay. All character/arena values come from `MatchSetup`, never hardcoded names.

### Gameplay

`GameplayScene` — the selected arena is the real fighting background with a scrim, floor line and tinted ambient particles. Both fighters stand on the same ground plane with automatic facing, collision separation and arena bounds.

## Playable match

| System         | Implementation                                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physics        | Gravity, jump velocity, ground detection, landing squash, frame-rate-independent horizontal drag, arena bounds and two-fighter separation.                                                                                              |
| Fighter states | `idle`, `walk`, `run`, `jump`, `land`, `crouch`, `block`, four attacks, `hit`, `knockback`, `knockdown`, `getup`, `victory`, `defeat`.                                                                                                  |
| Attacks        | Light Punch / Heavy Punch / Kick / Special with real **startup → active → recovery** timing in `ATTACKS`. A hitbox exists only during the active window; `CombatSystem` intersects it with the defender's body box. One hit per attack. |
| Defensive play | Blocking reduces damage, block reaction, knockback, hitstun, knockdown/get-up chain.                                                                                                                                                    |
| Resources      | Energy gained on dealing/taking hits; Special costs 60 energy and has a cooldown. Combo counter with a 900 ms window.                                                                                                                   |
| CPU opponent   | State-based `OpponentAI`: `idle / approach / retreat / attack / block / jump / hit / knockdown`. Timed decisions, no attack spam while an attack or cooldown is running.                                                                |
| HUD            | Portraits, names, orange/purple health bars, round indicators, energy bars, 99-second timer, combo text and a functional pause button — all driven by live match values.                                                                |
| Rounds         | Best of three, two wins to take the match, time-out decided by remaining health, draws handled without a crash. Short READY / FIGHT between rounds.                                                                                     |
| Result         | In-flow `VICTORY` / `DEFEAT` / `DRAW` overlay with the winner name, REMATCH and MAIN MENU.                                                                                                                                              |
| Pause          | `P` or the HUD button pauses movement, AI, timer and combat; RESUME / RESTART MATCH / QUIT TO MAIN MENU all work. An intentional pause is never auto-resumed by a device rotation.                                                      |

## Controls

Keyboard (configured centrally in `src/constants/controls.ts`):

| Action                                     | Key                                 |
| ------------------------------------------ | ----------------------------------- |
| Move left / right                          | `A` / `D` (also arrow keys)         |
| Jump / crouch                              | `W` / `S` (also arrow keys)         |
| Light Punch / Heavy Punch / Kick / Special | `J` / `K` / `L` / `U`               |
| Block                                      | `Space`                             |
| Pause                                      | `P` (Escape closes the pause popup) |

Touch: nine large circular controls (four-way D-pad plus Punch, Heavy, Kick, Special, Block), multi-touch capable, shown only on coarse-pointer devices when the saved setting allows. `MobileControls` applies all three Settings preferences — Show/Hide, Left-Handed and Touch Control Size — and clears held keys on release/blur so no control sticks.

## Modular architecture

```
src/constants/     arenas, characters, controls, match/combat tuning, fighterFrames (generated)
src/types/         arenas, match, input, characters, audio, system
src/game/arenas/   ArenaSelection (game-level arena state)
src/game/characters/ CharacterSelection, Fighter (physics + state machine)
src/game/animations/ FighterAnimator (frame-based Phaser anims)
src/game/combat/   CombatSystem, HitboxManager
src/game/ai/       OpponentAI
src/game/input/    InputManager (keyboard + virtual, held/pressed separation)
src/game/match/    MatchSetup, MatchManager, PauseManager
src/game/audio/    AudioManager, AudioUnlock, audioPreferences, audioKeys, Sfx
src/game/config/   gameConfig, sceneRegistry, FullscreenManager, OrientationManager, QuitController
src/game/scenes/   Boot, Loading, Welcome, GameMode, Character, Arena, ArenaPreview, VsIntro, Gameplay
src/game/ui/       arena cards/panels, MatchHud, MobileControls, PausePopup, ResultOverlay,
                   ScreenHeader, InfoBar, IconButton, ArcadeButton, ModalPopup, GameHud, ...
```

`sceneRegistry.ts` remains the single scene-registration point. `FIGHTER_ANIMATIONS` in `src/constants/fighterFrames.ts` is generated by the art pipeline from the exact same frame spec as the sprite sheets, so animation definitions and sheet layout cannot drift apart.

## Assets and art pipeline

`assets_work/process_phase6_assets.py` (Pillow / NumPy / SciPy, offline only) reproducibly generates:

- five 1280 × 720 arena backdrops — four original illustrations plus Temple Grounds derived from the established Welcome courtyard plate with integer doubling;
- five 216 × 292 cut-corner arena card plates;
- seven 1760 × 1560 sprite sheets (8 × 6 cells of 220 × 260) with **44 distinct frames each**, composed from the same chroma-keyed cutouts that produced the Phase 5 roster — so Kenji and Shadow keep their established designs;
- sixteen short original synthesised WAV sound effects;
- `src/constants/fighterFrames.ts` and a gitignored review sheet.

The frame rig produces genuinely different poses per state (body lean, squash, limb-region extension, rotation, tint, accent motion arcs and glow), not a single static PNG slid across the screen. Phaser plays these as real frame-based animations at state-specific frame rates.

All UI icons are vendored **Lucide** SVGs (ISC) with white strokes, rasterised at 64 × 64 with linear filtering. No emoji or Unicode text symbols are used as icons. Fonts remain the self-hosted Google Fonts WOFF2 faces from Phase 4, awaited before Phaser boots.

## Audio

`AudioManager` is the only sound service: one persistent theme sound, a master gain that mutes music and every SFX at once, and the saved mute preference restored from `localStorage`. SFX go through `playSfx()`/`Sfx.ts` and are destroyed on completion, so no duplicate instances accumulate. The persistent theme continues across every transition (including QUIT TO MAIN MENU); it is not restarted, and no second music instance is created. Phase 6 uses it as the arena/match music rather than adding a competing per-arena track.

## Shared systems

Phase 5's fixes remain in place and are reused by every new screen:

- **QUIT** — `QuitController` + `QuitPopup`: exact `ARE YOU SURE YOU WANT TO QUIT?`, YES / CANCEL, `window.close()` only in a permitted context, then an honest `window.closed` check and a manual-close fallback. Never a blank screen or a false success.
- **Volume** — `GameHud` badge toggles the central `AudioManager`, swaps `volume-2` / `volume-x` immediately, persists the preference, and never restarts music.
- **Fullscreen** — `FullscreenManager` uses the Fullscreen API from a real gesture, syncs from `fullscreenchange` (browser-driven exits included), handles unsupported/denied requests without throwing, and refreshes FIT scaling without distortion.
- **Orientation** — `OrientationManager` measures the real viewport (`visualViewport`, resize, `orientationchange`, media query), toggles a DOM overlay with a rotating phone illustration and the exact `ROTATE YOUR DEVICE` copy, coalesces scale refreshes, and never reloads a scene. `PauseManager` pauses active gameplay in portrait and auto-resumes only orientation pauses.

## Rendering and responsive behaviour

Framebuffer `1280 × 720` with an integer camera zoom of 2 over the `640 × 360` logical space; all Phaser Text uses `resolution: 2`; the CSS stage is capped at `1280 × 720` and shown 1:1 or smoothly reduced. Pixel-art plates keep nearest-neighbour filtering while SVG icons use linear filtering. Landscape-only: portrait hides `#game-root` and shows the orientation overlay. Verified at `1920×1080`, `1280×720`, `1024×768`, `1024×600`, `844×390`, `667×375` (all ≈1.7778) and `390×844` portrait.

## Technology stack

| Concern            | Choice                                                             |
| ------------------ | ------------------------------------------------------------------ |
| Game engine        | Phaser 3 (`phaser@3.90.0`)                                         |
| Language           | TypeScript strict (`typescript@5.9.3`)                             |
| Build              | Vite (`vite@7.3.7`)                                                |
| Runtime dependency | `phaser` only                                                      |
| Code quality       | ESLint 10 flat config + Prettier                                   |
| Icons              | Vendored Lucide SVG (ISC), no runtime dependency                   |
| Art / audio        | Offline Pillow / NumPy / SciPy pipelines, not runtime dependencies |

Node `^20.19.0 || >=22.12.0` and npm 10+ are required to build.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build and local preview:

```bash
npm run build
npm run preview    # http://localhost:4173
```

Both servers bind to `0.0.0.0` and accept proxied host headers.

## npm scripts

| Script                            | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `npm run dev`                     | Vite dev server with HMR              |
| `npm run build`                   | `tsc --noEmit` then production bundle |
| `npm run preview`                 | Serve the built `dist/`               |
| `npm run typecheck`               | Strict TypeScript validation          |
| `npm run lint` / `lint:fix`       | ESLint                                |
| `npm run format` / `format:check` | Prettier                              |

## Verification

Executed with headless Chromium (Playwright) against the dev server and the production preview:

- **Gates:** `format:check`, `lint`, `typecheck`, clean `npm run build`.
- **Loading / regression:** 98 queued files, `loadErrors: 0`, all fonts loaded, canvas `1280 × 720` with zoom 2, music playing from the 70% trigger, all five fonts, Loading / Welcome / Game Mode / Character screens still boot, mobile Settings persisted.
- **Phase 5 fixes:** QUIT popup copy, CANCEL, blocked-close fallback, volume mute/unmute with persistence and no music restart, one active music sound, fullscreen request/exit/browser-driven sync, portrait overlay copy + animation + glows, landscape recovery.
- **Flow:** all seven character cards, statistics from character data, RANDOM among unlocked fighters, Back chain, five arena cards, arrows, preview PREVIOUS/NEXT with live panels, CONFIRM twice, VS sequence auto-complete, Gameplay inheriting player/opponent/arena/mode, non-default Titan + Frozen Peak integration.
- **Gameplay:** A/D/W/S/Space, facing, bounds, all four attacks, real hitbox damage, blocking reduction, special energy cost/gate, timer, AI state changes, best-of-three rounds, result overlay, REMATCH, pause/resume/restart/quit, portrait pause with no auto-resume of an intentional pause.
- **Mobile / audio:** nine touch buttons, saved left-handed/large preferences, held D-pad movement, simultaneous two-finger input, no stuck keys, sixteen SFX cached, muted SFX not played, single persistent music instance.
- **Screenshots reviewed:** Welcome, Game Mode, Character, Arena Selection, Arena Preview, VS Intro, Gameplay (Temple Grounds and Frozen Peak), result overlay, mobile controls, portrait overlay.

**Not proven:** headless Chromium is muted, so audible playback cannot be verified. SwiftShader runs at roughly 10 FPS, so the 60 FPS target is not benchmarked on real hardware; viewport emulation is not a physical device test. Autoplay-unlock enforcement was strictly proven in Phase 2, not re-proven here.

## Known limitations and deferred work

- Fighter frames are composed procedurally from the established character cutouts (real distinct poses, 17 states) rather than hand-drawn keyframe sprite sheets; limb articulation is intentionally stylised.
- There is no separate per-arena music track — the persistent theme serves as the match music to avoid duplicate instances and restarts.
- No character-specific voice lines, no advanced results/leaderboard screen, no tournament/multiplayer/survival implementation, and no Arena Selection beyond the five configured arenas.
- Game modes remain display-only selections carried through the flow; they do not yet change match rules.
- `debugBridge` and the DEV-only `__FA__` inspection handle are excluded from production builds.
