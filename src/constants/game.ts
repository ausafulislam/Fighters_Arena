/**
 * Project-wide game dimensions and timing constants.
 * These are configuration values only - no gameplay logic lives here.
 */

/** Internal (authoring) resolution: all art and coordinates target this size. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Target display resolution: exactly 2x the internal resolution. */
export const TARGET_DISPLAY_WIDTH = 1280;
export const TARGET_DISPLAY_HEIGHT = 720;

export const GAME_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;
export const PIXEL_SCALE = TARGET_DISPLAY_WIDTH / GAME_WIDTH;

/** Frame budget used by future fixed-step combat and animation logic. */
export const TARGET_FPS = 60;
export const FRAME_MS = 1000 / TARGET_FPS;

/** DOM element that owns the Phaser canvas (see index.html). */
export const GAME_PARENT_ID = 'game-root';

/** Landscape is the only supported play orientation. */
export const GAME_ORIENTATION = 'landscape' as const;
export type GameOrientation = typeof GAME_ORIENTATION;
