import Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { DEPTH, LOADING_CONFIG } from '@/constants/loading';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
import { createRandom } from '@/utils/math';

interface Petal {
  image: Phaser.GameObjects.Image;
  baseX: number;
  y: number;
  speed: number;
  sway: number;
  frequency: number;
  phase: number;
  spin: number;
}

interface Ember {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  phase: number;
  baseAlpha: number;
}

/** Slow falling cherry blossom petals and rising warm / violet embers. */
export class LoadingAtmosphere {
  private readonly scene: Phaser.Scene;
  private readonly random = createRandom(0x5a17c2);
  private petals: Petal[] = [];
  private embers: Ember[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  revealPetals(): void {
    if (!this.scene.textures.exists(TEXTURE_KEYS.PETAL) || this.petals.length > 0) return;
    const tints = [FX_COLORS.petalPink, FX_COLORS.petalMagenta, FX_COLORS.petalDeep];

    for (let i = 0; i < LOADING_CONFIG.PETAL_COUNT; i += 1) {
      const image = this.scene.add
        .image(0, 0, TEXTURE_KEYS.PETAL)
        .setTint(tints[i % tints.length] ?? FX_COLORS.petalPink)
        .setAlpha(0.5 + this.random() * 0.4)
        .setDepth(DEPTH.ATMOSPHERE);
      const petal: Petal = {
        image,
        baseX: this.random() * GAME_WIDTH,
        y: this.random() * GAME_HEIGHT,
        speed: 9 + this.random() * 13,
        sway: 4 + this.random() * 11,
        frequency: 0.35 + this.random() * 0.5,
        phase: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 1.1,
      };
      this.petals.push(petal);
    }
  }

  revealEmbers(): void {
    if (!this.scene.textures.exists(TEXTURE_KEYS.EMBER) || this.embers.length > 0) return;

    for (let i = 0; i < LOADING_CONFIG.EMBER_COUNT; i += 1) {
      const leftSide = i % 2 === 0;
      const x = leftSide
        ? 8 + this.random() * (GAME_WIDTH * 0.32)
        : GAME_WIDTH * 0.68 + this.random() * (GAME_WIDTH * 0.3);
      const image = this.scene.add
        .image(x, 0, TEXTURE_KEYS.EMBER)
        .setTint(leftSide ? FX_COLORS.emberOrange : PALETTE_HEX.purple)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.ATMOSPHERE + 1);
      this.embers.push({
        image,
        x,
        y: GAME_HEIGHT * 0.55 + this.random() * GAME_HEIGHT * 0.42,
        speed: 11 + this.random() * 20,
        phase: this.random() * Math.PI * 2,
        baseAlpha: 0.35 + this.random() * 0.4,
      });
    }
  }

  update(timeMs: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const seconds = timeMs / 1000;

    for (const petal of this.petals) {
      petal.y += petal.speed * dt;
      if (petal.y > GAME_HEIGHT + 8) {
        petal.y = -8;
        petal.baseX = this.random() * GAME_WIDTH;
      }
      petal.image.setPosition(
        Math.round(petal.baseX + Math.sin(seconds * petal.frequency + petal.phase) * petal.sway),
        Math.round(petal.y),
      );
      petal.image.rotation += petal.spin * dt;
    }

    for (const ember of this.embers) {
      ember.y -= ember.speed * dt;
      if (ember.y < -6) {
        ember.y = GAME_HEIGHT - 20;
        ember.x =
          ember.x < GAME_WIDTH / 2
            ? 8 + this.random() * (GAME_WIDTH * 0.32)
            : GAME_WIDTH * 0.68 + this.random() * (GAME_WIDTH * 0.3);
      }
      ember.image.setPosition(
        Math.round(ember.x + Math.sin(seconds * 1.3 + ember.phase) * 3),
        Math.round(ember.y),
      );
      ember.image.setAlpha(ember.baseAlpha * (0.65 + 0.35 * Math.sin(seconds * 4 + ember.phase)));
    }
  }
}
