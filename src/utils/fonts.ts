import { ASSET_URLS } from '@/constants/assets';

/** Self-hosted arcade display font used by the loading screen (Anton, SIL OFL). */
export const UI_FONT_FAMILY = 'FA Anton';
export const UI_FONT_STACK = `"${UI_FONT_FAMILY}", "Arial Black", Impact, sans-serif`;

/**
 * Phase 3 menu / popup faces. Each weight is registered under its own family
 * name because Phaser composes the canvas font as
 * `[fontStyle] [fontSize] [fontFamily]` and has no separate fontWeight field.
 * Distinct family names make weight selection unambiguous.
 */
export const DISPLAY_FONT = '"FA Oxanium 700", "Arial Black", sans-serif';
export const DISPLAY_MEDIUM_FONT = '"FA Oxanium 600", "Arial", sans-serif';
export const MENU_FONT = '"FA Rajdhani 700", "Arial Narrow", sans-serif';
export const BODY_FONT = '"FA Rajdhani 600", "Arial", sans-serif';

interface FaceSpec {
  family: string;
  url: string;
}

/** All UI faces are loaded before Phaser creates any Text objects. */
const FACES: readonly FaceSpec[] = [
  { family: UI_FONT_FAMILY, url: ASSET_URLS.font },
  { family: 'FA Oxanium 700', url: ASSET_URLS.fontOxanium700 },
  { family: 'FA Oxanium 600', url: ASSET_URLS.fontOxanium600 },
  { family: 'FA Rajdhani 700', url: ASSET_URLS.fontRajdhani700 },
  { family: 'FA Rajdhani 600', url: ASSET_URLS.fontRajdhani600 },
];

const FONT_TIMEOUT_MS = 4000;

function loadFace(spec: FaceSpec): Promise<void> {
  const face = new FontFace(spec.family, `url("${spec.url}")`, {
    style: 'normal',
    weight: '400',
    display: 'block',
  });
  return face.load().then((loaded) => {
    document.fonts.add(loaded);
  });
}

/**
 * A font failure never blocks the game: the fallback stack still renders.
 * A generous timeout prevents a hung font request from stalling boot.
 */
export async function loadUiFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return;

  let timer = 0;
  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, FONT_TIMEOUT_MS);
  });

  await Promise.race([Promise.allSettled(FACES.map(loadFace)).then(() => undefined), timeout]);
  window.clearTimeout(timer);
}
