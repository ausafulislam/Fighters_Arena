import type Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { DEPTH, LOADING_LAYOUT } from '@/constants/loading';

interface Fighter {
  image: Phaser.GameObjects.Image;
  baseY: number;
  phase: number;
}

/**
 * Kenji (left, fire) and Shadow (right, violet). Only one frame per fighter
 * exists in this phase, so the idle animation is a gentle integer-pixel bob
 * that keeps the nearest-neighbour artwork perfectly sharp.
 */
export class FighterShowcase {
  private readonly scene: Phaser.Scene;
  private fighters: Fighter[] = [];
  private readonly revealed = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  reveal(key: string): void {
    let position;
    if (key === TEXTURE_KEYS.KENJI) position = LOADING_LAYOUT.kenji;
    else if (key === TEXTURE_KEYS.SHADOW) position = LOADING_LAYOUT.shadow;
    else return;

    if (this.revealed.has(key) || !this.scene.textures.exists(key)) return;
    this.revealed.add(key);
    const image = this.scene.add.image(position.x, position.y, key).setDepth(DEPTH.FIGHTERS);
    this.fighters.push({
      image,
      baseY: position.y,
      phase: key === TEXTURE_KEYS.KENJI ? 0 : Math.PI * 0.8,
    });
  }

  update(timeMs: number): void {
    const seconds = timeMs / 1000;
    for (const fighter of this.fighters) {
      fighter.image.setY(
        Math.round(fighter.baseY + Math.sin(seconds * 1.55 + fighter.phase) * 1.7),
      );
    }
  }
}
