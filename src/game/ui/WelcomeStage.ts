import Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { WELCOME_CONFIG, WELCOME_DEPTH, WELCOME_LAYOUT } from '@/constants/welcome';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
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
  spin: number;
}

interface Ember {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  phase: number;
  alpha: number;
}

/**
 * Layered welcome-screen stage. Reuses the established Phase 2 plates so the
 * two screens share one art direction, while keeping every element separate:
 * courtyard plate, moon / side glows, one drifting cloud bank, the exact same
 * Kenji and Shadow cutouts, wordmark, petals and embers.
 */
export class WelcomeStage {
  private readonly scene: Phaser.Scene;
  private readonly random = createRandom(0x71a3e5);
  private readonly moonGlow: Phaser.GameObjects.Image;
  private readonly cloud: Phaser.GameObjects.Image;
  private readonly kenji: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly logo: Phaser.GameObjects.Image;
  private readonly logoBaseY = WELCOME_LAYOUT.logo.y;
  private readonly logoScale: number;
  private readonly petals: Petal[] = [];
  private readonly embers: Ember[] = [];
  private entranceDone = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    createSoftGlowTexture(scene);

    const L = WELCOME_LAYOUT;
    scene.add
      .image(L.background.x, L.background.y, TEXTURE_KEYS.WELCOME_COURTYARD)
      .setDepth(WELCOME_DEPTH.BACKGROUND);

    this.moonGlow = scene.add
      .image(L.moonGlow.x, L.moonGlow.y, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(FX_COLORS.moonGlow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(L.moonGlow.width, L.moonGlow.height)
      .setAlpha(0.4)
      .setDepth(WELCOME_DEPTH.MOON_GLOW);

    for (const [position, tint, alpha] of [
      [L.leftGlow, PALETTE_HEX.orange, 0.22],
      [L.rightGlow, FX_COLORS.violetGlow, 0.26],
    ] as const) {
      scene.add
        .image(position.x, position.y, RUNTIME_TEXTURES.SOFT_GLOW)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(position.width, position.height)
        .setAlpha(alpha)
        .setDepth(WELCOME_DEPTH.SIDE_GLOW);
    }

    this.cloud = scene.add
      .image(L.cloud.x, L.cloud.y, TEXTURE_KEYS.CLOUD_BANK)
      .setTint(FX_COLORS.cloudTint)
      .setDisplaySize(L.cloud.width, (L.cloud.width * 113) / 360)
      .setAlpha(L.cloud.alpha)
      .setDepth(WELCOME_DEPTH.CLOUDS);

    this.kenji = scene.add
      .image(L.kenji.x, L.kenji.y, TEXTURE_KEYS.KENJI)
      .setDepth(WELCOME_DEPTH.FIGHTERS);
    this.shadow = scene.add
      .image(L.shadow.x, L.shadow.y, TEXTURE_KEYS.SHADOW)
      .setDepth(WELCOME_DEPTH.FIGHTERS);

    this.logo = scene.add.image(L.logo.x, L.logo.y, TEXTURE_KEYS.LOGO).setDepth(WELCOME_DEPTH.LOGO);
    this.logoScale = L.logo.width / this.logo.width;
    this.logo
      .setScale(this.logoScale * 0.9)
      .setAlpha(0.35)
      .setAngle(-1.2);
    scene.tweens.add({
      targets: this.logo,
      scaleX: this.logoScale,
      scaleY: this.logoScale,
      alpha: 1,
      angle: 0,
      duration: 620,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.entranceDone = true;
      },
    });

    this.createParticles();
  }

  private createParticles(): void {
    const tints = [FX_COLORS.petalPink, FX_COLORS.petalMagenta, FX_COLORS.petalDeep];
    for (let i = 0; i < WELCOME_CONFIG.PETAL_COUNT; i += 1) {
      const image = this.scene.add
        .image(0, 0, TEXTURE_KEYS.PETAL)
        .setTint(tints[i % tints.length] ?? FX_COLORS.petalPink)
        .setAlpha(0.5 + this.random() * 0.4)
        .setDepth(WELCOME_DEPTH.ATMOSPHERE);
      this.petals.push({
        image,
        baseX: this.random() * GAME_WIDTH,
        y: this.random() * GAME_HEIGHT,
        speed: 8 + this.random() * 12,
        sway: 4 + this.random() * 10,
        frequency: 0.3 + this.random() * 0.5,
        phase: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 1.0,
      });
    }

    for (let i = 0; i < WELCOME_CONFIG.EMBER_COUNT; i += 1) {
      const leftSide = i % 2 === 0;
      const x = leftSide
        ? 6 + this.random() * (GAME_WIDTH * 0.3)
        : GAME_WIDTH * 0.7 + this.random() * (GAME_WIDTH * 0.28);
      const image = this.scene.add
        .image(x, 0, TEXTURE_KEYS.EMBER)
        .setTint(leftSide ? FX_COLORS.emberOrange : PALETTE_HEX.purple)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(WELCOME_DEPTH.ATMOSPHERE + 1);
      this.embers.push({
        image,
        x,
        y: GAME_HEIGHT * 0.56 + this.random() * GAME_HEIGHT * 0.4,
        speed: 10 + this.random() * 17,
        phase: this.random() * Math.PI * 2,
        alpha: 0.3 + this.random() * 0.4,
      });
    }
  }

  update(timeMs: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const seconds = timeMs / 1000;

    // Gentle atmosphere: one slow cloud bank and a breathing moon halo.
    const cloudWidth = this.cloud.displayWidth;
    this.cloud.x += WELCOME_LAYOUT.cloud.speed * dt;
    if (this.cloud.x - cloudWidth / 2 > GAME_WIDTH) this.cloud.x = -cloudWidth / 2;
    this.moonGlow.setAlpha(0.36 + Math.sin(seconds * 0.7) * 0.06);

    // Integer-pixel idle keeps the nearest-neighbour character art sharp.
    this.kenji.setY(Math.round(WELCOME_LAYOUT.kenji.y + Math.sin(seconds * 1.45) * 1.6));
    this.shadow.setY(Math.round(WELCOME_LAYOUT.shadow.y + Math.sin(seconds * 1.45 + 2.3) * 1.6));

    if (this.entranceDone) {
      this.logo.setY(Math.round(this.logoBaseY + Math.sin(seconds * 1.05) * 1.1));
    }

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
        ember.y = GAME_HEIGHT - 16;
        ember.x =
          ember.x < GAME_WIDTH / 2
            ? 6 + this.random() * (GAME_WIDTH * 0.3)
            : GAME_WIDTH * 0.7 + this.random() * (GAME_WIDTH * 0.28);
      }
      ember.image.setPosition(
        Math.round(ember.x + Math.sin(seconds * 1.2 + ember.phase) * 3),
        Math.round(ember.y),
      );
      ember.image.setAlpha(ember.alpha * (0.65 + 0.35 * Math.sin(seconds * 3.6 + ember.phase)));
    }
  }
}
