/**
 * Project-wide game dimensions and timing constants.
 * These are configuration values only - no gameplay logic lives here.
 */

/** Logical (authoring) resolution: all art and coordinates target this size. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/**
 * The framebuffer is rendered at 2x the logical resolution. Every scene uses an
 * integer camera zoom (see utils/camera.ts) so game code keeps working in
 * 640 x 360 coordinates while Text, SVG icons and vector Graphics are actually
 * rasterised with 1280 x 720 worth of pixels. Rendering UI into a 640 x 360
 * canvas and CSS-upscaling it was the root cause of the blurry text and icons.
 */
export const RENDER_SCALE = 2;
export const RENDER_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const RENDER_HEIGHT = GAME_HEIGHT * RENDER_SCALE;

/** Target display resolution: exactly the framebuffer size (1:1, no upscaling). */
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
