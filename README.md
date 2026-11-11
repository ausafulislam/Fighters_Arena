# FIGHTER'S ARENA

**Complete character-art, animation and gameplay overhaul** — a browser-based, 2D side-view arcade fighting game built with **Phaser 3.90**, **TypeScript** and **Vite**, in a **Modern HD Pixel Art + Classic Arcade Fighting Game** style.

> This build replaces the old stretched-illustration "animation" with genuinely drawn, frame-by-frame pixel-art fighters played by real Phaser `anims`, and replaces hand-rolled kinematics with **Phaser Arcade Physics**. The entire previous game flow is preserved and working. There is still no multiplayer, online leaderboard, tournament bracket or survival campaign.

---

## Contents

- [What changed](#what-changed)
- [Development flow](#development-flow)
- [Character art](#character-art)
- [Frame-by-frame animations](#frame-by-frame-animations)
- [Animation system and state machine](#animation-system-and-state-machine)
- [Arcade Physics movement](#arcade-physics-movement)
- [Combat system](#combat-system)
- [CPU opponent](#cpu-opponent)
- [The seven fighters](#the-seven-fighters)
- [Arenas and layered environments](#arenas-and-layered-environments)
- [Gameplay HUD and feedback](#gameplay-hud-and-feedback)
- [Controls](#controls)
- [Audio](#audio)
- [Visual style](#visual-style)
- [Technical requirements](#technical-requirements)
- [Modular architecture](#modular-architecture)
- [Assets and art pipeline](#assets-and-art-pipeline)
- [Animation preview tool](#animation-preview-tool)
- [Official documentation](#official-documentation)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Verification](#verification)
- [Known limitations](#known-limitations)

---

## What changed

| Area            | Before                                                    | Now                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character art   | One AI illustration per fighter, chroma-keyed             | One procedurally rigged, fully shaded pixel-art body per fighter, drawn part by part                                                                                                                        |
| Animation       | The same cutout stretched / rotated / tinted per "frame"  | **112 individually rendered skeleton poses per fighter**, 21 Phaser animations                                                                                                                              |
| Runtime sprite  | `Phaser.GameObjects.Sprite` with manual frame switching   | `Phaser.Physics.Arcade.Sprite` with `anims` + a 15-state machine                                                                                                                                            |
| Movement        | Manual `x += vx * dt`, manual gravity                     | Arcade Physics gravity, jump impulse, world-bound floor, acceleration/deceleration, body separation                                                                                                         |
| Combat          | Hitboxes already existed but animation did not match them | Startup/active/recovery hitboxes aligned to the actual drawn punch/kick frames, per-character damage/defence/reach, knockdown + get-up                                                                      |
| CPU             | Basic timer-based decisions                               | Reactive state-based AI (approach, spacing, block, duck, retreat, jump, distance-based attacks, anti-spam gap)                                                                                              |
| Presentation    | Static backdrop + a few petals                            | Five arena-specific layered ambience systems (parallax clouds, flickering lanterns/neon, petals/embers/leaves/snow/rain, ground motes), controlled impact sparks, damage numbers, combo badge, screen shake |
| Mobile controls | Fixed button positions                                    | Size-derived layout that cannot overlap at any of the three control sizes                                                                                                                                   |

---

## Development flow

```
Boot → Loading → Welcome → Game Mode Selection → Character Selection
     → Arena Selection → Arena Preview → VS Intro → Gameplay → Match Results
```

Every screen is preserved: Loading (honest progress + 70% music trigger), Welcome (About popup, Mobile Settings, Quit / Volume / Fullscreen / Rotate Your Device), Game Mode Selection, Character Selection (7 cards, stats, RANDOM, Back), Arena Selection, Arena Preview, VS Intro, Gameplay (Pause Menu) and Match Results (REMATCH / MAIN MENU). `MatchSetup`, `CharacterSelection` and `ArenaSelection` remain game-level singletons, so the chosen mode, fighters and arena survive all transitions. Back buttons walk the chain in reverse.

---

## Character art

`assets_work/fighter_rig.py` draws each fighter from a **real skeleton**: hip, shoulders, elbows, wrists, knees, ankles and toes. Every frame contains a separately shaped, outlined, three-tone-shaded head, torso, upper/lower arms, fists, thighs, shins, boots, hair/headwear and character-specific accessories. All fighters share:

- proper human-like anatomy with clearly defined head, torso, arms, legs, hands and feet;
- a unique silhouette, hair, headwear, clothing construction and accessories;
- consistent proportions and one constant pixel density (1 authored pixel = 2 × 2 framebuffer pixels under the integer camera zoom);
- clean dark outlines, a subtle accent rim light, transparent backgrounds and side-view fighting poses;
- the established identities of **KENJI** (red gi, brown spiky hair, orange headband, orange identity) and **SHADOW** (purple hooded ninja, masked face, forehead plate, trailing scarf, purple identity).

The seven designs are not recolours: Blaze has flame hair and a phoenix vest, Iron Fist a steel breastplate and gauntlets, Storm a visor and lightning-trimmed suit, Raven a cloak, mask and blade, Titan a much wider, heavier bare-chested silhouette with straps and oversized boots.

---

## Frame-by-frame animations

Each fighter's sheet is **1200 × 1344** (10 × 12 cells of 120 × 112). 112 cells are used; every cell is a distinct pose. Seven sheets = **784 unique frames**.

| Animation                                | Frames | Animation                               | Frames |
| ---------------------------------------- | -----: | --------------------------------------- | -----: |
| `idle` (breathing fighting stance, loop) |      8 | `breathing` (stillness variation, loop) |      4 |
| `walk_forward`                           |      6 | `walk_backward`                         |      6 |
| `run`                                    |      6 | `jump_takeoff`                          |      3 |
| `jump_airborne` (loop)                   |      4 | `falling`                               |      3 |
| `landing`                                |      3 | `crouch` (loop)                         |      4 |
| `block` (loop)                           |      4 | `light_punch`                           |      6 |
| `heavy_punch`                            |      7 | `kick`                                  |      7 |
| `special` (character-specific VFX)       |      9 | `hit`                                   |      4 |
| `knockback`                              |      4 | `knockdown`                             |      5 |
| `getup`                                  |      6 | `victory` (character-specific, loop)    |      8 |
| `defeat`                                 |      5 |                                         |        |

Attack animations have distinct wind-up, extension/active and recovery poses; idle loops smoothly; walking and running show alternating leg and arm motion; jumping has separate take-off, airborne, falling and landing frames; knockdown rotates the whole skeleton onto the floor and get-up reverses it. Animation fps is chosen so attack playback length matches the attack's startup + active + recovery window. No CSS transitions, position tweens or duplicated frames are used as animation.

`src/constants/fighterFrames.ts` is generated from the very same frame specification, so the sheet layout and runtime definitions cannot drift apart.

---

## Animation system and state machine

`src/game/animations/FighterAnimator.ts` registers 21 Phaser `anims` per fighter (147 total) with `generateFrameNumbers`, and resolves exactly one animation from the state. `src/game/characters/Fighter.ts` owns the single upper-case state machine:

`IDLE · WALKING · RUNNING · JUMPING · FALLING · LANDING · CROUCHING · BLOCKING · ATTACKING · HIT · KNOCKBACK · KNOCKDOWN · RECOVERING · VICTORY · DEFEAT`

- No movement → `IDLE` / `breathing` after stillness.
- Horizontal movement → `WALKING` (`walk_forward` or `walk_backward`) or `RUNNING`.
- Jump input → `JUMPING` (`jump_takeoff` → `jump_airborne`); descending → `FALLING`; ground contact → `LANDING`.
- Attack input → `ATTACKING` with that attack's animation; hits → `HIT` / `KNOCKBACK`; heavy strikes → `KNOCKDOWN` → `RECOVERING`.
- Round result → `VICTORY` / `DEFEAT`.

`playFighterState` only calls `sprite.play()` when the resolved animation key actually changes, so an animation is **never restarted every update frame** and a walk loop cannot play during an attack. One-shot completion (`ANIMATION_COMPLETE`) drives landing and get-up transitions; locked states are never overwritten by locomotion input.

---

## Arcade Physics movement

`gameConfig.ts` enables `physics.default = 'arcade'` with world gravity 0; each fighter body sets `gravityY = 1500`, `maxVelocity`, `collideWorldBounds` and a centred `44 × 112` body. The Arcade world bounds bottom **is** the arena floor (`GROUND_Y = 292`), so `body.blocked.down` provides real ground detection.

- Jump: `setVelocityY(-470)` → real parabolic arc → `blocked.down` on landing.
- Horizontal: frame-rate-independent exponential approach to the target velocity (controlled acceleration and deceleration), with reduced air control.
- Facing: recomputed from the opponent's body position every frame; `setFlipX` applies it.
- Separation: an Arcade `collider` between the two fighters (grounded only, so jumps never stack them) plus a minimum-distance body adjustment.
- Pause: `physics.pause()` / `resume()` plus per-sprite animation pause/resume, so nothing drifts while the Pause Menu is open.

---

## Combat system

`constants/match.ts` → `ATTACKS` defines real startup / active / recovery timing, damage, reach, hitbox size, knockback, hitstun, energy gain, cooldown, knockdown flag and SFX for Light Punch, Heavy Punch, Kick and Special. `CombatSystem` + `HitboxManager` resolve the **active-window attack hitbox** against the defender's body box — never a hit just because sprites overlap.

- Damage uses each fighter's centralised `combat` profile (damage, move speed, defence divisor, reach, energy gain).
- Blocking reduces damage (`BLOCK_REDUCTION = 0.22`), grants energy and plays the block animation/SFX.
- Hit reactions, knockback, knockdown, get-up, hitstun, attack cooldowns, combo tracking and a 100-point special-energy meter with a 60-point cost are all functional.
- Controlled feedback: pixel sparks, an impact ring, a one-frame defender flash, damage numbers, a combo badge, a health-bar pulse and a very short camera shake. Effects are small and short-lived so they never hide the character animations.

---

## CPU opponent

`OpponentAI.ts` is state-based (`idle / approach / retreat / attack / block / crouch / jump / hit / knockdown`). It approaches when far, maintains preferred spacing, blocks or ducks incoming attacks, retreats at low health or on a roll, jumps occasionally at long range, picks Light Punch up close and Kick / Heavy Punch at range, uses Special when charged, respects cooldowns and enforces a minimum gap between attacks so it cannot spam. It drives the **same** `Fighter` class, so the opponent is genuinely animated, not a static image.

---

## The seven fighters

| Fighter   | Identity                                         | Style                      | Special                     |
| --------- | ------------------------------------------------ | -------------------------- | --------------------------- |
| KENJI     | Red gi, brown spiky hair, orange headband        | BLAZING FIST / KARATE      | BLAZING FIST (fireball)     |
| SHADOW    | Purple hooded ninja, mask, forehead plate, scarf | SHADOW ARTS / NINJUTSU     | SHADOW SLASH (blade arc)    |
| BLAZE     | Flame hair, red/orange phoenix vest              | PHOENIX FLAME / STRIKING   | PHOENIX BURST (flame burst) |
| IRON FIST | Steel breastplate, gauntlets                     | IRON GUARD / BRAWLING      | IRON SHOCKWAVE (shockwave)  |
| STORM     | White hair, visor, blue lightning suit           | THUNDER STYLE / KICKBOXING | THUNDER STRIKE (lightning)  |
| RAVEN     | Black/purple cloak, mask, blade                  | BLADE DANCE / KENJUTSU     | NIGHT BLADE (blade arc)     |
| TITAN     | Huge muscular silhouette, straps, big boots      | EARTHBREAKER / GRAPPLING   | EARTHBREAKER (quake)        |

`constants/characters.ts` is the single source of truth for names, styles, accent colours, stats, combat profiles, special names, victory/defeat pose variants and texture keys. All seven are selectable and fight with their own sheet, stats and special presentation; their victory poses and collapse animations are individually rendered, not shared poses.

---

## Arenas and layered environments

Temple Grounds, Blazing Canyon, Bamboo Forest, Frozen Peak and Skyline Rooftop keep their distinct backdrops. `ArenaAmbience.ts` adds, per arena, a far parallax cloud/mist bank, flickering lantern/neon lights, mid-depth falling petals / embers / leaves / snow / rain, and low ground motes. `constants/arenas.ts` → `ARENA_AMBIENCE` configures count, colour, speed and sway. Every layer renders **behind** the fighters (`depth < MATCH_DEPTH.FIGHTERS`), wraps without popping, and is controlled by one small update loop, so background animation never interferes with gameplay.

---

## Gameplay HUD and feedback

`MatchHud.ts` shows the new rig-derived portraits, both names, mirrored health bars, special-energy bars, a round-count indicator, the 99-second timer and a pause button. Health bars reflect real damage, the timer counts down, round indicators update on K.O., and a white pulse marks the bar that lost health. K.O. / TIME UP / DRAW banners, victory/defeat poses and the Result overlay close out the match.

---

## Controls

**Keyboard** (`constants/controls.ts`, single source for gameplay and on-screen help):

| Key       | Action            | Key                | Action      |
| --------- | ----------------- | ------------------ | ----------- |
| `A` / `D` | move left / right | `W`                | jump        |
| `S`       | crouch            | `J`                | Light Punch |
| `K`       | Heavy Punch       | `L`                | Kick        |
| `U`       | Special Attack    | `Space`            | Block       |
| `P`       | Pause             | double-tap forward | Run         |

Arrow keys mirror the d-pad. **Mobile**: a 4-button d-pad (Left, Right, Jump, Crouch) and 5 action buttons (Light Punch, Heavy Punch, Kick, Special, Block) with consistent Lucide SVG icons, responsive circular hit areas, simultaneous multi-touch, a size-derived non-overlapping layout, optional left-handed mirroring and SMALL / MEDIUM / LARGE sizes from the saved Settings. Mobile controls are hidden on desktop, and `touch-action: none` prevents browser scrolling.

---

## Audio

`AudioManager` remains the single game-level audio service: one persistent background-music instance, first-interaction unlock, the 70% loading trigger, the saved mute preference and a master gain that covers music and all SFX. `audioKeys.ts` centralises **20 original synthesised SFX** — UI clicks, punches, kicks, blocks, impacts, jump, landing, whiff, combo, special, round bell, READY, FIGHT, K.O., victory and defeat. No third-party audio, no duplicate music playback.

---

## Visual style

Modern HD Pixel Art + Classic Arcade Fighting Game: nearest-neighbour scaling, hard pixel edges, clean outlines, three-tone shading, consistent proportions and pixel density, high-quality sprite sheets, appropriate frame timing and no blurry upscaling. Palette:

| Token      | Hex       | Token       | Hex       |
| ---------- | --------- | ----------- | --------- |
| Orange     | `#FF5A00` | Deep Orange | `#D93600` |
| Purple     | `#8B2BE2` | Deep Purple | `#4B176F` |
| Background | `#101014` | Panel       | `#1B1B22` |
| White      | `#FFFFFF` | Gold        | `#FFC247` |

---

## Technical requirements

- Phaser 3.90.0, TypeScript 5.9, Vite 7, HTML5 Canvas / WebGL, no new runtime packages.
- Logical authoring resolution **640 × 360**; framebuffer **1280 × 720** via integer camera zoom ×2.
- `pixelArt: true`, `antialias: false`, `roundPixels: true`, nearest-neighbour scaling, 60 FPS target.
- Landscape-only with the Rotate Your Device overlay; portrait pause semantics preserved.
- Modular code: constants, types, scenes, animation, physics/character, combat, AI, input, HUD, effects, ambience, audio and settings are separate modules. `sceneRegistry.ts` remains the single scene-registration point.

---

## Modular architecture

```
src/constants/     characters, fighterFrames (generated), match, controls, arenas, assets, palette…
src/types/         characters, match, input, arenas, audio, system…
src/game/
  animations/      FighterAnimator.ts        — Phaser anim registration + state→animation resolution
  characters/      Fighter.ts                — Arcade Sprite, 15-state machine, combat runtime
  combat/          CombatSystem.ts, HitboxManager.ts, EffectsManager.ts
  ai/              OpponentAI.ts
  arenas/          ArenaAmbience.ts, ArenaSelection.ts
  audio/           AudioManager, AudioUnlock, Sfx, audioKeys, audioPreferences
  input/           InputManager.ts
  match/           MatchManager, MatchSetup, PauseManager
  ui/              MatchHud, MobileControls, ResultOverlay, PausePopup, cards, popups…
  scenes/          Boot → Loading → Welcome → ModeSelect → CharacterSelect → ArenaSelect
                   → ArenaPreview → VsIntro → Gameplay
  config/          gameConfig, sceneRegistry, FullscreenManager, OrientationManager, QuitController
src/tools/         animPreview.ts            — dev-only animation preview tool
src/utils/         camera, textures, fonts, icons, typography, debugBridge…
```

---

## Assets and art pipeline

```
/tmp/fa-venv/bin/python assets_work/process_overhaul_assets.py
```

`fighter_rig.py` (skeleton drawing) + `fighter_animation_specs.py` (pose tracks) produce the 7 sprite sheets, 7 HUD portraits, 7 character cards, 7 showcases, the two loading-screen fighters, 4 new WAV SFX and `src/constants/fighterFrames.ts`. Existing generators (`process_assets.py`, `process_welcome_assets.py`, `process_character_assets.py`, `process_game_mode_assets.py`, `process_phase6_assets.py`) remain for the earlier screens' plates, fonts, theme and arena backdrops. Generated review sheets live in the gitignored `assets_work/preview/`.

---

## Animation preview tool

Open **`/anim-preview.html`** on the Vite dev server. It loads the real sheets, registers the real Phaser `anims`, and lets you step through all 21 animations for all 7 fighters:

`←/→` animation · `↑/↓` fighter · `1–7` fighter · `SPACE` pause · `A` auto-play all · `R` reset.

It displays the frame list, fps, loop flag, duration, the current sheet frame and playhead, and exposes `window.__ANIM_PREVIEW__` for automated verification. It is a developer tool, not part of the normal game flow.

---

## Official documentation

Implemented against the Phaser 3.90.0 API (verified in `node_modules/phaser/types/phaser.d.ts` and the installed engine source) and these official references:

- [Phaser 3 — Animations](https://docs.phaser.io/phaser/concepts/animations) (`anims.create`, `generateFrameNumbers`, `repeat`, `play`, `ANIMATION_COMPLETE`)
- [Phaser 3 — Sprite Game Objects](https://docs.phaser.io/phaser/concepts/gameobjects/sprite)
- [Phaser 3 — Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade) (`gravity`, `setVelocity`, `blocked.down`, `collider`, `pause/resume`)
- [Phaser 3 — Input](https://docs.phaser.io/phaser/concepts/input)
- [Phaser 3 — Game Objects](https://docs.phaser.io/phaser/concepts/gameobjects)
- [Aseprite documentation](https://www.aseprite.org/docs/), [sprite sheets](https://www.aseprite.org/docs/sprite-sheet/), [animation workflow](https://www.aseprite.org/docs/animation/), [CLI / exporting](https://www.aseprite.org/docs/cli/)

The rig reproduces the sprite-sheet / animation-tag workflow those documents describe: numbered cells, tagged frame ranges, frame rates and loop flags, exported as one sheet plus a generated definition file. Aseprite itself is not installed in this environment, so the frames are rendered by the repository's Python pixel-art rig instead of an .aseprite source; the runtime consumes standard Phaser spritesheets, which is Aseprite's documented export target.

---

## Getting started

```bash
npm ci
npm run dev       # http://localhost:5173  (bound to 0.0.0.0, proxy-friendly Hosts allowed)
npm run build     # tsc --noEmit && vite build
npm run preview   # production preview on :4173
```

Node 20.19+ / 22.12+. The dev server renders through the proxied preview host.

---

## npm scripts

| Script                    | Purpose                           |
| ------------------------- | --------------------------------- |
| `dev`                     | Vite dev server on `0.0.0.0:5173` |
| `build`                   | Typecheck + production bundle     |
| `preview`                 | Serve the production bundle       |
| `typecheck`               | `tsc --noEmit`                    |
| `lint` / `lint:fix`       | ESLint                            |
| `format` / `format:check` | Prettier                          |

---

## Verification

`format:check`, `lint`, `typecheck` and a clean `npm run build` pass. Two headless-Chromium harnesses ran **104 automated checks, all passing**:

**Gameplay / flow harness (62/62)** — 110/110 loaded files with 0 errors; 7×21 registered animations with 112 distinct frames each; all 21 required animation names; portraits and new SFX; the full Welcome → Mode → Character → Arena → Preview → VS → Gameplay click flow; Arcade gravity/floor/grounded; idle loops with changing frames; forward/backward walk, run, crouch, block; complete jump → airborne → falling → landing sequence returning exactly to `y = 292`; light/heavy/kick/special animations, startup→active→recovery, real hitbox damage, blocking damage reduction, energy cost, no walk animation during attacks; facing, separation, CPU states/animations/movement/attacks; HUD timer, round indicators, pause/resume with physics, mute preference; the animation preview tool cycling all 21 animations and all 7 fighters with a moving playhead; zero console/request errors.

**Coverage harness (42/42)** — all 7 fighters idle + attack in a real match; all 5 arenas' ambient layers; all 21 animations and 7 fighters in the preview tool; SMALL / MEDIUM / LARGE touch layouts with zero overlaps; heavy-punch knockdown + get-up states and animations; victory/defeat animations; match winner + result overlay; breathing idle variation; all 20 SFX + persistent theme; desktop hides mobile controls; touch device shows them with saved left-handed + LARGE preferences; 9 controls with zero overlapping hit areas, all inside the field; simultaneous 2-finger touch and clean release; no runtime errors.

**Not proven by these tests:** audible playback (headless Chromium is muted by `@sparticuz/chromium`'s `--mute-audio`), a sustained real 60 FPS (SwiftShader software rendering ran at roughly 6–8 FPS, so wall-clock animation speed is not representative), behaviour on a physical phone or tablet (viewport/touch emulation only), and hand-painted keyframe artistry — the frames are procedurally rendered from a skeleton rig, not individually hand-drawn in an editor.

---

## Known limitations

- The fighter frames are generated by a deterministic pixel-art rig. They are genuine, distinct, shaded poses with moving limbs, but they are not hand-drawn animation cels.
- Persistent theme music is shared across arenas; there is no separate per-arena track.
- No online multiplayer, leaderboard persistence, tournament bracket or survival campaign (unchanged from earlier phases).
- LEADERBOARD on the Welcome screen remains display-only.
- The animation preview tool is a dev-server page; it is not included in the production `index.html` build input.
