import { ASSET_URLS } from '@/constants/assets';

/** Self-hosted arcade display font (Anton, SIL OFL). */
export const UI_FONT_FAMILY = 'FA Anton';
export const UI_FONT_STACK = `"${UI_FONT_FAMILY}", "Arial Black", Impact, sans-serif`;

/**
 * Load the UI font before Phaser creates any Text objects, otherwise they
 * would be rasterised with the fallback face and never re-rendered.
 * A font failure never blocks the game: the fallback stack still renders.
 */
export async function loadUiFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return;

  const face = new FontFace(UI_FONT_FAMILY, `url("${ASSET_URLS.font}")`, {
    style: 'normal',
    weight: '400',
    display: 'block',
  });

  try {
    // A generous timeout prevents a hung font request from stalling boot.
    await Promise.race([
      face.load().then((loaded) => document.fonts.add(loaded)),
      new Promise<void>((_resolve, reject) => {
        window.setTimeout(() => reject(new Error('font timeout')), 4000);
      }),
    ]);
  } catch {
    // Fallback font stack remains in use.
  }
}
