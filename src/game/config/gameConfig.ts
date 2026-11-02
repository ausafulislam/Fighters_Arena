import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_PARENT_ID, GAME_WIDTH, TARGET_FPS } from '@/constants/game';
import { BACKGROUND_COLOR } from '@/constants/palette';

/**
 * Engine-level Phaser configuration for the whole project.
 *
 * Phase 1 scope: rendering, resolution, scaling, timing and audio only.
 * No scenes, characters, arenas or gameplay systems are registered here yet.
 */
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL when available, HTML5 Canvas fallback.
  parent: GAME_PARENT_ID,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
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
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    autoRound: true,
  },

  fps: {
    target: TARGET_FPS,
  },

  audio: {
    // Web Audio API when supported; Phaser falls back to HTML5 Audio.
    disableWebAudio: false,
  },

  banner: false,

  // Intentionally empty: no game screens or scenes exist in Phase 1.
  scene: [],
};
