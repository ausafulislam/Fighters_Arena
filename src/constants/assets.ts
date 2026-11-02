/**
 * Canonical asset roots, URL resolution and asset keys.
 * `public/` files are served verbatim, so URLs are built from Vite's BASE_URL
 * (works both on the dev server and for `base: './'` production hosting).
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

const base = import.meta.env.BASE_URL;
const basePrefix = base.endsWith('/') ? base : `${base}/`;

export const assetUrl = (path: string): string => `${basePrefix}${path}`;

/** Keys used with the Phaser texture / audio caches. */
export const TEXTURE_KEYS = {
  ARENA_NIGHT: 'arena-night',
  CLOUD_BANK: 'cloud-bank',
  KENJI: 'fighter-kenji',
  SHADOW: 'fighter-shadow',
  LOGO: 'logo-fighters-arena',
  GLOW: 'fx-glow',
  PETAL: 'fx-petal',
  EMBER: 'fx-ember',
  FLAMES_WARM: 'fx-flames-warm',
  FLAMES_VIOLET: 'fx-flames-violet',
} as const;

export const ANIMATION_KEYS = {
  FLAMES_WARM: 'anim-flames-warm',
  FLAMES_VIOLET: 'anim-flames-violet',
} as const;

/** URLs for every asset loaded by the boot / loading phases. */
export const ASSET_URLS = {
  arenaNight: assetUrl(`${ASSET_PATHS.backgrounds}/arena_night.png`),
  cloudBank: assetUrl(`${ASSET_PATHS.backgrounds}/cloud_bank.png`),
  flamesWarm: assetUrl(`${ASSET_PATHS.backgrounds}/flames.png`),
  flamesViolet: assetUrl(`${ASSET_PATHS.backgrounds}/flames_violet.png`),
  kenji: assetUrl(`${ASSET_PATHS.spriteSheets}/kenji.png`),
  shadow: assetUrl(`${ASSET_PATHS.spriteSheets}/shadow.png`),
  logo: assetUrl(`${ASSET_PATHS.ui}/logo_fighters_arena.png`),
  glow: assetUrl(`${ASSET_PATHS.ui}/glow.png`),
  petal: assetUrl(`${ASSET_PATHS.ui}/petal.png`),
  ember: assetUrl(`${ASSET_PATHS.ui}/ember.png`),
  font: assetUrl(`${ASSET_PATHS.fonts}/anton-latin-400-normal.woff2`),
  themeOgg: assetUrl(`${ASSET_PATHS.music}/theme_main.ogg`),
  themeMp3: assetUrl(`${ASSET_PATHS.music}/theme_main.mp3`),
} as const;

/** The loading screen spritesheet frames are authored at 16 x 24 pixels. */
export const FLAME_FRAME = { width: 16, height: 24, count: 4 } as const;
