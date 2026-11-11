import Phaser from 'phaser';

import { ASSET_PATHS, assetUrl } from '@/constants/assets';

/**
 * One consistent icon language for the whole game: Lucide (ISC), vendored as
 * real SVG files under public/assets/ui/icons/. No emoji, no text glyphs, no
 * hand-drawn low-resolution raster sheets.
 *
 * The SVGs are rasterised once by Phaser's SVG loader at 64 x 64 - four times
 * the usual logical icon size - so even the largest icon has more source
 * detail than framebuffer pixels. Linear filtering keeps the stroke edges
 * smooth, while the pixel-art plates keep their own nearest-neighbour filter.
 */
export const UI_ICONS = {
  BACK: 'arrow-left',
  VOLUME: 'volume-2',
  FULLSCREEN: 'maximize',
  PLAY: 'play',
  SETTINGS: 'settings',
  LEADERBOARD: 'trophy',
  ABOUT: 'info',
  QUIT: 'log-out',
  BATTLE: 'swords',
  TOURNAMENT: 'trophy',
  VERSUS: 'users-round',
  SURVIVAL: 'shield',
  CLOSE: 'x',
  MUTED: 'volume-x',
  MINIMIZE: 'minimize',
  RANDOM: 'shuffle',
  QUESTION: 'circle-help',
  ARROW_UP: 'arrow-up',
  ARROW_DOWN: 'arrow-down',
  ARROW_RIGHT: 'arrow-right',
  CHEVRON_LEFT: 'chevron-left',
  CHEVRON_RIGHT: 'chevron-right',
  PAUSE: 'pause',
  RETRY: 'rotate-ccw',
  HOME: 'house',
  SPECIAL: 'zap',
  PUNCH: 'hand',
  KICK: 'footprints',
  CHECK: 'check',
  SNOWFLAKE: 'snowflake',
  MOUNTAIN: 'mountain',
  FLAME: 'flame',
  TREES: 'trees',
  CITY: 'building-2',
  SPARKLES: 'sparkles',
  TIMER: 'timer',
  HEART: 'heart',
} as const;

export type UiIcon = (typeof UI_ICONS)[keyof typeof UI_ICONS];

const ICON_FILES: readonly string[] = [...new Set<string>(Object.values(UI_ICONS))];

/** 4x a 16px logical icon; comfortably larger than any on-screen icon. */
export const ICON_RASTER_SIZE = 64;

export const iconTextureKey = (name: string): string => `ui-icon-${name}`;

export const iconAssetUrl = (name: string): string =>
  assetUrl(`${ASSET_PATHS.ui}/icons/${name}.svg`);

/** Queue every icon once during the loading screen, before any menu renders. */
export function loadUiIcons(loader: Phaser.Loader.LoaderPlugin): number {
  for (const name of ICON_FILES) {
    loader.svg(iconTextureKey(name), iconAssetUrl(name), {
      width: ICON_RASTER_SIZE,
      height: ICON_RASTER_SIZE,
    });
  }
  return ICON_FILES.length;
}

/** Number of distinct icon files queued by `loadUiIcons`. */
export const UI_ICON_COUNT = ICON_FILES.length;

/** SVG strokes benefit from smooth filtering; the pixel-art textures do not. */
export function applyIconFiltering(scene: Phaser.Scene): void {
  for (const name of ICON_FILES) {
    const key = iconTextureKey(name);
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
}

/** Place a perfectly sized, consistently styled Lucide icon. */
export function addIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: UiIcon,
  size: number,
  tint = 0xffffff,
): Phaser.GameObjects.Image {
  return scene.add
    .image(Math.round(x), Math.round(y), iconTextureKey(name))
    .setDisplaySize(size, size)
    .setTint(tint);
}
