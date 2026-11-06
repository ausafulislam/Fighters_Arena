import Phaser from 'phaser';

import { GAME_PARENT_ID, RENDER_HEIGHT, RENDER_WIDTH, TARGET_FPS } from '@/constants/game';
import { BACKGROUND_COLOR } from '@/constants/palette';

/**
 * Engine-level Phaser configuration for the whole project.
 *
 * Engine-level settings only: rendering, resolution, scaling, timing and audio.
 * Scene classes are registered separately through sceneRegistry.ts.
 *
 * The canvas is 1280 x 720 (RENDER_SCALE = 2). Scenes keep the 640 x 360
 * logical coordinate system by applying an integer camera zoom, so UI text and
 * vector chrome get full display-resolution detail instead of being magnified
 * from a 640 x 360 bitmap. Pixel-art plates are still doubled with nearest
 * neighbour, which preserves the hard pixel edges of the art direction.
 */
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL when available, HTML5 Canvas fallback.
  parent: GAME_PARENT_ID,
  width: RENDER_WIDTH,
  height: RENDER_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,

  // Modern HD pixel art: no filtering, integer coordinates, crisp upscaling.
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  powerPreference: 'high-performance',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: RENDER_WIDTH,
    height: RENDER_HEIGHT,
    autoRound: true,
  },

  fps: {
    target: TARGET_FPS,
  },

  // Arcade Physics drives real gravity, ground detection, jump velocity,
  // acceleration/deceleration and body separation during the match. Gravity is
  // set per fighter body (see characters/Fighter.ts); world gravity stays at 0
  // so every other scene is unaffected.
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      fixedStep: true,
      fps: TARGET_FPS,
      debug: false,
    },
  },

  audio: {
    // Web Audio API when supported; Phaser falls back to HTML5 Audio.
    disableWebAudio: false,
  },

  banner: false,
};
