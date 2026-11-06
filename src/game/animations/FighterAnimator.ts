import type Phaser from 'phaser';

import { fighterSheetTextureKey } from '@/constants/assets';
import { FIGHTER_ANIMATIONS } from '@/constants/fighterFrames';
import type { FighterAnimationName } from '@/constants/fighterFrames';

/**
 * Registers the frame-based animations for one fighter sheet. Every state has
 * its own frame range, frame rate and loop flag from the generated frame map,
 * so the sheet layout and the runtime definitions can never drift apart.
 * Phaser anims are global to the game and keyed by character, so seven
 * fighters can share a scene without collisions.
 */
export function createFighterAnimations(scene: Phaser.Scene, characterId: string): void {
  const textureKey = fighterSheetTextureKey(characterId);
  for (const [name, definition] of Object.entries(FIGHTER_ANIMATIONS) as [
    FighterAnimationName,
    (typeof FIGHTER_ANIMATIONS)[FighterAnimationName],
  ][]) {
    const key = fighterAnimKey(characterId, name);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        frames: [...definition.frames],
      }),
      frameRate: definition.fps,
      repeat: definition.repeat,
    });
  }
}

export const fighterAnimKey = (characterId: string, name: FighterAnimationName): string =>
  `fighter-${characterId}-${name}`;

/** Play a state once, restarting only when the state actually changes. */
export function playFighterState(
  sprite: Phaser.GameObjects.Sprite,
  characterId: string,
  state: FighterAnimationName,
  force = false,
): void {
  const key = fighterAnimKey(characterId, state);
  if (sprite.anims.currentAnim?.key === key && !force) return;
  sprite.play(key, true);
}

/** Frame 0 of each sprite sheet is a clean idle pose for portraits / VS. */
export function fighterIdleFrame(): number {
  return FIGHTER_ANIMATIONS.idle.frames[0] ?? 0;
}
