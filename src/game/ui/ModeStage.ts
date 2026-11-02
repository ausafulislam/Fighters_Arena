import Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
import { MODE_CONFIG, MODE_DEPTH, MODE_LAYOUT } from '@/constants/gameModes';
import { createRandom } from '@/utils/math';
import { createSoftGlowTexture, RUNTIME_TEXTURES } from '@/utils/textures';

interface Petal {
  image: Phaser.GameObjects.Image;
  baseX: number;
  y: number;
  speed: number;
  sway: number;
  frequency: number;
  phase: number;
}

/**
 * Moonlit temple courtyard for the Game Mode screen. Reuses the exact Welcome
 * courtyard plate (and the established glow / cloud / petal layers) so the
 * transition from the main menu keeps one continuous visual identity, with a
 * soft scrim that gives the four cards enough contrast.
 */
export class ModeStage {
  private readonly random = createRandom(0x4b21c9);
  private readonly moonGlow: Phaser.GameObjects.Image;
  private readonly cloud: Phaser.GameObjects.Image;
  private readonly petals: Petal[] = [];

  constructor(scene: Phaser.Scene) {
    createSoftGlowTexture(scene);

    const L = MODE_LAYOUT;
    scene.add
      .image(L.background.x, L.background.y, TEXTURE_KEYS.WELCOME_COURTYARD)
      .setDepth(MODE_DEPTH.BACKGROUND);

    scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0712, 1)
      .setAlpha(0.3)
      .setDepth(MODE_DEPTH.SCRIM);

    this.moonGlow = scene.add
      .image(L.moonGlow.x, L.moonGlow.y, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(FX_COLORS.moonGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(L.moonGlow.width, L.moonGlow.height)
      .setAlpha(0.34)
      .setDepth(MODE_DEPTH.MOON_GLOW);

    for (const [position, tint, alpha] of [
      [L.leftGlow, PALETTE_HEX.orange, 0.2],
      [L.rightGlow, FX_COLORS.violetGlow, 0.22],
    ] as const) {
      scene.add
        .image(position.x, position.y, RUNTIME_TEXTURES.SOFT_GLOW)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(position.width, position.height)
        .setAlpha(alpha)
        .setDepth(MODE_DEPTH.SIDE_GLOW);
    }

    this.cloud = scene.add
      .image(L.cloud.x, L.cloud.y, TEXTURE_KEYS.CLOUD_BANK)
      .setTint(FX_COLORS.cloudTint)
      .setDisplaySize(L.cloud.width, (L.cloud.width * 113) / 360)
      .setAlpha(L.cloud.alpha)
      .setDepth(MODE_DEPTH.CLOUDS);

    const tints = [FX_COLORS.petalPink, FX_COLORS.petalMagenta, FX_COLORS.petalDeep];
    for (let i = 0; i < MODE_CONFIG.PETAL_COUNT; i += 1) {
      const image = scene.add
        .image(0, 0, TEXTURE_KEYS.PETAL)
        .setTint(tints[i % tints.length] ?? FX_COLORS.petalPink)
        .setAlpha(0.4 + this.random() * 0.35)
        .setDepth(MODE_DEPTH.PETALS);
      this.petals.push({
        image,
        baseX: this.random() * GAME_WIDTH,
        y: this.random() * GAME_HEIGHT,
        speed: 7 + this.random() * 11,
        sway: 4 + this.random() * 9,
        frequency: 0.3 + this.random() * 0.5,
        phase: this.random() * Math.PI * 2,
      });
    }
  }

  update(timeMs: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const seconds = timeMs / 1000;

    const cloudWidth = this.cloud.displayWidth;
    this.cloud.x += MODE_LAYOUT.cloud.speed * dt;
    if (this.cloud.x - cloudWidth / 2 > GAME_WIDTH) this.cloud.x = -cloudWidth / 2;
    this.moonGlow.setAlpha(0.32 + Math.sin(seconds * 0.7) * 0.05);

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
    }
  }
}
