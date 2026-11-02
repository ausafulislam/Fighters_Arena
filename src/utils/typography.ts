import type Phaser from 'phaser';

import { RENDER_SCALE } from '@/constants/game';
import { MENU_FONT } from '@/utils/fonts';

/**
 * Phaser Text draws into its own little canvas texture. At the default
 * resolution of 1, a 14px label contains only 14px of glyph detail and is then
 * magnified by the camera - that is the blur. Matching the text resolution to
 * the integer camera zoom gives a 1:1 texel-to-framebuffer mapping.
 */
export const UI_TEXT_RESOLUTION = RENDER_SCALE;

export type UiTextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Apply the shared crisp-text defaults without repeating them at each site. */
export function uiTextStyle(style: UiTextStyle): UiTextStyle {
  return {
    fontFamily: MENU_FONT,
    color: '#FFFFFF',
    align: 'center',
    ...style,
    resolution: UI_TEXT_RESOLUTION,
  };
}

/**
 * Single entry point for Phaser-rendered text. Coordinates stay in the
 * 640 x 360 logical space and are intentionally integer (pixel-perfect).
 */
export function addUiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style: UiTextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(Math.round(x), Math.round(y), text, uiTextStyle(style));
}

/** Optional wide tracking for display headings; Phaser spacing is in pixels. */
export function tracked(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: UiTextStyle,
  spacing: number,
): Phaser.GameObjects.Text {
  return addUiText(scene, x, y, text, { ...style, letterSpacing: spacing });
}
