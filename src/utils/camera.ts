import type Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '@/constants/game';

/**
 * Map the fixed 640 x 360 logical coordinate space onto the 1280 x 720
 * framebuffer with an exact integer zoom. Must be called once at the start of
 * every scene before that scene renders anything.
 *
 * With `setZoom(2)` and `centerOn(320, 180)` the camera scroll becomes
 * (-320, -180), so world (0, 0) lands on framebuffer (0, 0) and world
 * (640, 360) lands on (1280, 720). Phaser's input system reverses the same
 * camera matrix, so `pointer.worldX / worldY` stays in logical coordinates.
 */
export function configureSceneCamera(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(RENDER_SCALE);
  camera.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/** Convert a raw pointer position into the 640 x 360 logical space. */
export function pointerToLogical(
  scene: Phaser.Scene,
  x: number,
  y: number,
): { x: number; y: number } {
  return scene.cameras.main.getWorldPoint(x, y);
}
