import type Phaser from 'phaser';

import { fighterSheetTextureKey } from '@/constants/assets';
import {
  FIGHTER_ANIMATIONS,
  FIGHTER_ANIMATION_NAMES,
  type FighterAnimationDef,
  type FighterAnimationName,
} from '@/constants/fighterFrames';
import type { AttackName, FighterState } from '@/types/match';

/**
 * The animation layer between the state machine and Phaser's real Animation
 * Manager. Each fighter sheet carries 112 individually drawn frames (see
 * assets_work/fighter_rig.py); this module registers 21 Phaser `anims` per
 * character from the generated frame map and resolves a state to exactly one
 * animation. Nothing here tweens a static image.
 */

export const fighterAnimKey = (characterId: string, name: FighterAnimationName): string =>
  `fighter-${characterId}-${name}`;

export interface AnimationContext {
  attack: AttackName | null;
  /** True when walking towards the opponent. */
  forward: boolean;
  /** 'takeoff' plays the push-off frames; 'airborne' loops the tucked pose. */
  jumpPhase: 'takeoff' | 'airborne';
  /** Long periods of inactivity switch IDLE to the breathing variation. */
  breathing: boolean;
}

export const DEFAULT_ANIMATION_CONTEXT: AnimationContext = {
  attack: null,
  forward: true,
  jumpPhase: 'takeoff',
  breathing: false,
};

/** Map every canonical state onto its correct frame-based animation. */
export function resolveAnimation(
  state: FighterState,
  context: AnimationContext = DEFAULT_ANIMATION_CONTEXT,
): FighterAnimationName {
  switch (state) {
    case 'IDLE':
      return context.breathing ? 'breathing' : 'idle';
    case 'WALKING':
      return context.forward ? 'walk_forward' : 'walk_backward';
    case 'RUNNING':
      return 'run';
    case 'JUMPING':
      return context.jumpPhase === 'takeoff' ? 'jump_takeoff' : 'jump_airborne';
    case 'FALLING':
      return 'falling';
    case 'LANDING':
      return 'landing';
    case 'CROUCHING':
      return 'crouch';
    case 'BLOCKING':
      return 'block';
    case 'ATTACKING':
      return context.attack ?? 'light_punch';
    case 'HIT':
      return 'hit';
    case 'KNOCKBACK':
      return 'knockback';
    case 'KNOCKDOWN':
      return 'knockdown';
    case 'RECOVERING':
      return 'getup';
    case 'VICTORY':
      return 'victory';
    case 'DEFEAT':
      return 'defeat';
    default:
      return 'idle';
  }
}

/** Register all animations for one fighter sheet, once for the whole game. */
export function createFighterAnimations(scene: Phaser.Scene, characterId: string): void {
  const textureKey = fighterSheetTextureKey(characterId);
  for (const name of FIGHTER_ANIMATION_NAMES) {
    const key = fighterAnimKey(characterId, name);
    if (scene.anims.exists(key)) continue;
    const definition: FighterAnimationDef = FIGHTER_ANIMATIONS[name];
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        frames: [...definition.frames],
      }),
      frameRate: definition.fps,
      repeat: definition.repeat,
      // A one-shot animation holds its final frame until the state machine
      // explicitly transitions (hit reactions, knockdown, defeat, ...).
      hideOnComplete: false,
    });
  }
}

export const animationDef = (name: FighterAnimationName): FighterAnimationDef =>
  FIGHTER_ANIMATIONS[name];

export const animationDuration = (name: FighterAnimationName): number =>
  FIGHTER_ANIMATIONS[name].durationMs;

/**
 * Play the animation for a state. The key is only changed when the resolved
 * animation actually changes, so an animation is NEVER restarted on every
 * update frame. Returns the animation name that is now playing.
 */
export function playFighterState(
  sprite: Phaser.GameObjects.Sprite,
  characterId: string,
  state: FighterState,
  context: AnimationContext = DEFAULT_ANIMATION_CONTEXT,
  force = false,
): FighterAnimationName {
  const name = resolveAnimation(state, context);
  const key = fighterAnimKey(characterId, name);
  const current = sprite.anims.currentAnim?.key;
  if (current === key && !force) return name;
  sprite.play(key, true);
  return name;
}

/** Frame 0 of every sheet is a clean idle fighting stance. */
export function fighterIdleFrame(): number {
  return FIGHTER_ANIMATIONS.idle.frames[0] ?? 0;
}

export function fighterIdleAnimKey(characterId: string): string {
  return fighterAnimKey(characterId, 'idle');
}

/** Sheet frame index of the frame currently shown by a Phaser animation. */
export function currentSheetFrame(sprite: Phaser.GameObjects.Sprite): number {
  const frame = sprite.anims.currentFrame;
  if (!frame) return Number(sprite.frame.name) || 0;
  return Number(frame.frame.name) || 0;
}

/** 0-based playhead within the currently running animation. */
export function currentAnimationFrame(sprite: Phaser.GameObjects.Sprite): number {
  return sprite.anims.currentFrame?.index ?? 0;
}

export function registerAllFighterAnimations(scene: Phaser.Scene, ids: readonly string[]): void {
  for (const id of ids) createFighterAnimations(scene, id);
}
