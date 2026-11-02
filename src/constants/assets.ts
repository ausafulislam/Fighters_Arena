/**
 * Canonical asset roots, relative to index.html (Vite uses a relative base).
 * Scenes and loaders should reference these instead of hard-coding paths.
 * No assets are shipped in Phase 1 - the directories are prepared only.
 */
export const ASSET_ROOT = 'assets';

export const ASSET_PATHS = {
  characters: `${ASSET_ROOT}/characters`,
  spriteSheets: `${ASSET_ROOT}/characters/spritesheets`,
  animations: `${ASSET_ROOT}/characters/animations`,
  arenas: `${ASSET_ROOT}/arenas`,
  backgrounds: `${ASSET_ROOT}/arenas/backgrounds`,
  music: `${ASSET_ROOT}/audio/music`,
  sfx: `${ASSET_ROOT}/audio/sfx`,
  ui: `${ASSET_ROOT}/ui`,
  fonts: `${ASSET_ROOT}/fonts`,
} as const;

export type AssetPathKey = keyof typeof ASSET_PATHS;
