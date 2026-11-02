import { ASSET_URLS } from '@/constants/assets';

/**
 * Self-hosted Google Fonts faces (SIL OFL), copied from the official
 * @fontsource packages so the game never depends on a CDN at runtime.
 *
 * Phaser composes a canvas font as `[fontStyle] [fontSize] [fontFamily]` and
 * has no separate fontWeight field, so every weight is registered under its
 * own family name. The descriptors still carry the true weight, which stops
 * the browser from synthesising a fake bold on top of an already-bold face.
 */
export const UI_FONT_FAMILY = 'FA Anton';
export const UI_FONT_STACK = `"${UI_FONT_FAMILY}", "Arial Black", Impact, sans-serif`;

export const DISPLAY_FONT = '"FA Oxanium 700", "Arial Black", sans-serif';
export const DISPLAY_MEDIUM_FONT = '"FA Oxanium 600", "Arial", sans-serif';
export const MENU_FONT = '"FA Rajdhani 700", "Arial Narrow", sans-serif';
export const BODY_FONT = '"FA Rajdhani 600", "Arial", sans-serif';

interface FaceSpec {
  family: string;
  url: string;
  weight: string;
  css: string;
}

/** All UI faces are loaded and settled BEFORE Phaser creates its first Text. */
const FACES: readonly FaceSpec[] = [
  {
    family: UI_FONT_FAMILY,
    url: ASSET_URLS.font,
    weight: '400',
    css: '400 20px "FA Anton"',
  },
  {
    family: 'FA Oxanium 700',
    url: ASSET_URLS.fontOxanium700,
    weight: '700',
    css: '700 20px "FA Oxanium 700"',
  },
  {
    family: 'FA Oxanium 600',
    url: ASSET_URLS.fontOxanium600,
    weight: '600',
    css: '600 20px "FA Oxanium 600"',
  },
  {
    family: 'FA Rajdhani 700',
    url: ASSET_URLS.fontRajdhani700,
    weight: '700',
    css: '700 20px "FA Rajdhani 700"',
  },
  {
    family: 'FA Rajdhani 600',
    url: ASSET_URLS.fontRajdhani600,
    weight: '600',
    css: '600 20px "FA Rajdhani 600"',
  },
];

const FACE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    }),
  ]);
}

async function loadFace(spec: FaceSpec): Promise<void> {
  const face = new FontFace(spec.family, `url("${spec.url}")`, {
    style: 'normal',
    weight: spec.weight,
    display: 'block',
  });
  const loaded = await face.load();
  document.fonts.add(loaded);
  // Force the browser to actually rasterise this family now, not lazily on
  // first paint - lazily swapped faces were a source of blurry fallback text.
  await document.fonts.load(spec.css);
}

/**
 * Boot waits for every face (or a per-face timeout) and then for the font
 * loading set to settle. A failed font never blocks the game: the fallback
 * stack still renders, but Phaser Text objects are always created afterwards.
 */
export async function loadUiFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return;

  await Promise.allSettled(FACES.map((spec) => withTimeout(loadFace(spec), FACE_TIMEOUT_MS)));
  try {
    await document.fonts.ready;
  } catch {
    // A private-browsing / storage failure must not stall boot.
  }
}

/** Names exposed for automated typography checks in the browser. */
export const UI_FONT_FAMILIES: readonly string[] = FACES.map((spec) => spec.family);
