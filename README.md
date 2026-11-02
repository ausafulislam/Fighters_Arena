# FIGHTER'S ARENA

**Phase 1 — Project Initialization & Setup**

A browser-based, 2D side-view fighting game built around **Modern HD Pixel Art**.

> **Current scope:** project setup **only**. This repository contains a bootable, empty Phaser 3 canvas and a complete, modular TypeScript skeleton. It contains **no** main menu, game screens, characters, sprites, arenas, combat systems, player movement, AI, audio assets or placeholder gameplay. Implementation starts in Phase 2 and only on explicit instruction.

---

## Contents

- [Overview](#overview)
- [Technology stack](#technology-stack)
- [Technical targets](#technical-targets)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Project structure](#project-structure)
- [Configuration files](#configuration-files)
- [Game design direction](#game-design-direction)
- [Coding standards](#coding-standards)
- [Asset conventions](#asset-conventions)
- [Version control](#version-control)
- [Phase scope and deferred work](#phase-scope-and-deferred-work)

---

## Overview

FIGHTER'S ARENA is designed as a 2D side-view arcade fighting game rendered with HTML5 Canvas / WebGL. Phase 1 establishes the professional foundation: a Vite + TypeScript build pipeline, a strict lint/format toolchain, a single engine bootstrap, a pixel-perfect rendering configuration, and a folder layout that can absorb every later system without restructuring.

The only runtime file is `src/main.ts`, which creates a `Phaser.Game` from the shared engine configuration. Nothing is drawn, loaded or simulated yet.

---

## Technology stack

| Concern         | Choice                                               | Installed version                   |
| --------------- | ---------------------------------------------------- | ----------------------------------- |
| Game engine     | Phaser **3** (3.x line, ESM/UMD distribution)        | `phaser@3.90.0`                     |
| Language        | TypeScript (strict mode)                             | `typescript@5.9.3`                  |
| Rendering       | HTML5 Canvas / WebGL (`Phaser.AUTO`)                 | —                                   |
| Build tool      | Vite (stable Rollup pipeline)                        | `vite@7.3.7`                        |
| Package manager | npm (`package-lock.json` committed)                  | npm 10+                             |
| Audio           | Web Audio API via Phaser Audio, HTML5 Audio fallback | Phaser built-in                     |
| Code quality    | ESLint (flat config) + Prettier                      | `eslint@10.14.0`, `prettier@3.9.10` |
| Version control | Git                                                  | —                                   |

**Runtime dependency:** `phaser` only. Everything else is a development dependency.

**Development dependencies:** `typescript`, `vite`, `@types/node` (Node typings for `vite.config.ts`), `@eslint/js`, `eslint`, `typescript-eslint`, `eslint-config-prettier`, `globals`, `prettier`.

### Dependency compatibility notes

- **Phaser is pinned to `^3.90.0`.** npm's `latest` tag is now Phaser 4; the project specification requires Phaser 3, so the range deliberately excludes the 4.x major.
- **TypeScript is pinned to `~5.9.3`.** `typescript-eslint@8` declares a peer range of `>=4.8.4 <6.1.0`, so TypeScript 7 (and 6.1+) would produce an invalid peer dependency. The final 5.x release is the newest fully compatible compiler.
- **`eslint-config-prettier`** disables every ESLint rule that would conflict with Prettier. `eslint-plugin-prettier` is intentionally **not** installed: formatting is a separate, faster Prettier CLI step rather than an ESLint rule.
- All packages declare Node engines satisfied by the installed Node `22.22.3` (`^20.19.0 || >=22.12.0` / `^22.13.0`). `.nvmrc` pins the 22.x line.

---

## Technical targets

| Requirement                 | Implementation                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Internal game resolution    | `640 × 360` (`src/constants/game.ts`, `gameConfig.ts`)                                                              |
| Target display resolution   | `1280 × 720` — an exact **2×** integer upscale (`PIXEL_SCALE`)                                                      |
| Target performance          | `60 FPS` (`TARGET_FPS`, `fps.target`)                                                                               |
| Pixel-perfect rendering     | `pixelArt: true`, `antialias: false`, `antialiasGL: false`, `roundPixels: true`                                     |
| Nearest-neighbour scaling   | CSS `image-rendering: pixelated` (+ `crisp-edges` fallbacks) on the canvas                                          |
| Responsive landscape layout | 16:9 stage capped at `1280 × 720`; Phaser `Scale.FIT` + `CENTER_BOTH` inside that parent                            |
| Different screen sizes      | CSS `min()`/`dvh`-based stage sizing; Phaser FIT handles the rest                                                   |
| Desktop and mobile          | `touch-action: none`, no user scaling, no overscroll; WebGL with Canvas fallback                                    |
| Landscape-only gameplay     | `GAME_ORIENTATION = 'landscape'` + a 16:9-only stage. A dedicated orientation lock / rotate prompt is a later phase |
| Modular architecture        | Feature folders under `src/game/`, shared `src/constants`, `src/types`, `src/utils`, `@/*` path alias               |

`Phaser.Types.Core.GameConfig` has no orientation option, so orientation is expressed as a project constant and enforced by the viewport stage rather than faked in the engine config.

---

## Requirements

- **Node.js** `^20.19.0 || >=22.12.0` (developed and verified on `22.22.3`)
- **npm** `>=10`
- A modern desktop or mobile browser with WebGL support (HTML5 Canvas fallback available)

---

## Getting started

```bash
git clone <repository-url>
cd Fighters_Arena
nvm use            # optional, uses .nvmrc (Node 22)
npm install        # installs the exact tree from package-lock.json
npm run dev        # http://localhost:5173
```

Production build and local preview:

```bash
npm run build      # type-check + Vite production build -> dist/
npm run preview    # serves dist/ at http://localhost:4173
```

The Vite dev and preview servers bind to `0.0.0.0` and accept proxied host headers, so the app also works inside remote preview environments.

---

## npm scripts

| Script                 | Command                      | Purpose                                             |
| ---------------------- | ---------------------------- | --------------------------------------------------- |
| `npm run dev`          | `vite`                       | Start the development server with HMR               |
| `npm run build`        | `tsc --noEmit && vite build` | Type-check, then create the production bundle       |
| `npm run preview`      | `vite preview`               | Serve the built `dist/` locally                     |
| `npm run typecheck`    | `tsc --noEmit`               | Strict TypeScript validation without emitting files |
| `npm run lint`         | `eslint .`                   | Lint all JS/TS sources with the flat config         |
| `npm run lint:fix`     | `eslint . --fix`             | Lint and apply safe auto-fixes                      |
| `npm run format`       | `prettier --write .`         | Format the repository                               |
| `npm run format:check` | `prettier --check .`         | Verify formatting (CI-friendly, no writes)          |

Recommended pre-commit order: `npm run format && npm run lint && npm run typecheck && npm run build`.

---

## Project structure

```
Fighters_Arena/
├── index.html                     # Single HTML shell, #game-root canvas parent
├── public/
│   └── assets/                    # Static assets served verbatim (empty in Phase 1)
│       ├── characters/
│       │   ├── spritesheets/      # Character sprite sheets
│       │   └── animations/        # Animation data / frame sequences
│       ├── arenas/
│       │   └── backgrounds/       # Arena and parallax background art
│       ├── audio/
│       │   ├── music/             # Music tracks
│       │   └── sfx/               # Sound effects
│       ├── ui/                    # UI textures and icons
│       └── fonts/                 # Bitmap / web fonts
├── src/
│   ├── main.ts                    # Engine bootstrap (ONLY runtime entry point)
│   ├── styles/
│   │   └── main.css               # Viewport, 16:9 stage, nearest-neighbour scaling
│   ├── constants/
│   │   ├── game.ts                # Resolutions, FPS, orientation, parent id
│   │   ├── palette.ts             # Project colour palette (CSS + Phaser hex)
│   │   └── assets.ts              # Canonical asset paths
│   ├── types/                     # Shared TypeScript types (future phases)
│   ├── utils/                     # Pure helpers (future phases)
│   └── game/
│       ├── config/
│       │   └── gameConfig.ts      # Phaser engine configuration
│       ├── scenes/                # Boot / menu / match / results scenes
│       ├── characters/            # Fighter definitions and state
│       ├── animations/            # Animation setup and frame data
│       ├── arenas/                # Arena logic and background composition
│       ├── combat/                # Hitboxes, damage, combos, rounds
│       ├── controls/              # Keyboard, gamepad and touch bindings
│       ├── ai/                    # Enemy AI and difficulty logic
│       ├── audio/                 # Music and SFX playback services
│       ├── ui/                    # HUD, menus and reusable UI components
│       └── settings/              # User settings and persistence
├── eslint.config.js               # Flat ESLint config
├── tsconfig.json                  # Strict compiler options + @/* alias
├── vite.config.ts                 # Dev server, alias, build options
├── .prettierrc.json / .prettierignore
├── .editorconfig / .nvmrc / .gitignore
├── package.json / package-lock.json
└── README.md
```

Empty planned folders contain a `.gitkeep` so the architecture is committed. No placeholder source files, stub classes or dummy scenes are generated — those would be reworked in later phases.

---

## Configuration files

| File                            | Responsibility                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                  | Scripts, exact dependency ranges, `engines`, ESM (`"type": "module"`)                                                               |
| `package-lock.json`             | Reproducible dependency tree                                                                                                        |
| `tsconfig.json`                 | `ES2022`, `Bundler` resolution, strict + extra safety flags, `noEmit`, `@/*` → `src/*`                                              |
| `vite.config.ts`                | Relative `base`, `@` alias, dev/preview host + ports + allowed hosts, `es2022` build target, sourcemaps, no asset inlining          |
| `eslint.config.js`              | ESLint 10 flat config: `js.configs.recommended` + `typescript-eslint` recommended + Node/browser globals + `eslint-config-prettier` |
| `.prettierrc.json`              | Single quotes, semicolons, trailing commas, 100-column width, LF                                                                    |
| `.editorconfig`                 | Consistent encoding, indentation and line endings across editors                                                                    |
| `.nvmrc`                        | Node 22 toolchain pin                                                                                                               |
| `.gitignore`                    | `node_modules/`, `dist/`, caches, logs, env files, editor/OS junk                                                                   |
| `index.html`                    | Landscape/mobile viewport meta, dark theme colour, `#game-root` mount point                                                         |
| `src/styles/main.css`           | Responsive 16:9 stage and pixel-perfect canvas scaling                                                                              |
| `src/game/config/gameConfig.ts` | Phaser renderer, resolution, scale, FPS and audio settings                                                                          |

---

## Game design direction

These decisions are project-wide and guide all later phases; none are implemented as content yet.

- **Visual style:** Modern HD Pixel Art, inspired by polished 16-bit arcade fighting games.
- **Perspective:** 2D side-view fighting.
- **Orientation:** Landscape only.
- **Palette:**

| Token       | Hex       | Swatch role               |
| ----------- | --------- | ------------------------- |
| Orange      | `#FF5A00` | Primary accent            |
| Deep Orange | `#D93600` | Primary shadow / emphasis |
| Purple      | `#8B2BE2` | Secondary accent          |
| Deep Purple | `#4B176F` | Secondary shadow          |
| Background  | `#101014` | Canvas / page background  |
| Panel       | `#1B1B22` | UI panels                 |
| White       | `#FFFFFF` | Text                      |
| Gold        | `#FFC247` | Highlight / reward        |

The palette lives in `src/constants/palette.ts` as both CSS strings and numeric Phaser hex values. No personal watermarks or credits are embedded anywhere in the project.

---

## Coding standards

- **Strict TypeScript**: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`.
- **ESLint** flat config with `typescript-eslint` recommended rules, `consistent-type-imports`, and Node globals for tooling files.
- **Prettier** owns formatting; ESLint never enforces formatting rules.
- Use the `@/` alias for cross-feature imports; keep relative imports inside a feature folder.
- Use `import type` for type-only imports, `as const` for constant tables, and explicit return types on public APIs.
- Keep engine configuration in `src/game/config/`, magic numbers in `src/constants/`, and pure logic in `src/utils/`.
- Features are additive: register new scenes and systems in later phases without rewriting the bootstrap.

---

## Asset conventions

- All static assets live under `public/assets/` and are referenced through `ASSET_PATHS` (`src/constants/assets.ts`), never by hard-coded strings in scenes.
- Sprite sheets are upscaled with nearest-neighbour filtering; Vite's `assetsInlineLimit` is `0` so sheets remain real files instead of data URLs.
- Character sheets → `characters/spritesheets/`, frame/animation data → `characters/animations/`, arenas → `arenas/backgrounds/`, music → `audio/music/`, effects → `audio/sfx/`.
- **Phase 1 ships no assets.** The directories are empty on purpose; do not commit generated binaries, editor caches or large source art files.

---

## Version control

- Git is already initialized; `.gitignore` excludes dependencies, build output, caches, logs, local env files and editor/OS artefacts.
- `package-lock.json` **is** committed so every setup is reproducible.
- `dist/` and `node_modules/` are **not** committed.

---

## Phase scope and deferred work

**Included in Phase 1:** project initialization, package installation, Vite/TypeScript/ESLint/Prettier configuration, Phaser dependency wiring, engine-level render/scale/audio/FPS config, folder structure, asset directories, `.gitignore`, README, and verification of install, dev server, type-check, lint, format and production build.

**Explicitly deferred (do not add before Phase 2):** main menu and any game screen, character creation, pixel-art sprite generation, arenas and backgrounds, fighting/combat mechanics, player movement and controls, enemy AI, audio assets and playback, UI components, settings screens, and any placeholder gameplay.

---

## License

`UNLICENSED` — private project; licensing will be decided before distribution.
