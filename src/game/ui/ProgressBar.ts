import Phaser from 'phaser';

import { DEPTH, LOADING_LAYOUT } from '@/constants/loading';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
import { clamp } from '@/utils/math';
import {
  createProgressGradientTexture,
  createSoftGlowTexture,
  RUNTIME_TEXTURES,
} from '@/utils/textures';

const PADDING = 4;

/** Layered, glowing orange-to-gold progress bar. Built from runtime textures
 *  so it is available before any file has finished loading. */
export class ProgressBar {
  private readonly scene: Phaser.Scene;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly frameGlow: Phaser.GameObjects.Image;
  private readonly fillGlow: Phaser.GameObjects.Image;
  private readonly innerWidth: number;
  private readonly innerHeight: number;
  private progress = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { x, y, width, height } = LOADING_LAYOUT.bar;
    this.innerWidth = width - PADDING * 2;
    this.innerHeight = height - PADDING * 2;

    createSoftGlowTexture(scene);
    createProgressGradientTexture(scene, this.innerWidth, this.innerHeight);

    this.frameGlow = scene.add
      .image(x + width / 2, y + height / 2, RUNTIME_TEXTURES.SOFT_GLOW)
      .setDisplaySize(width + 44, height + 42)
      .setTint(PALETTE_HEX.gold)
      .setAlpha(0.17)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.HUD - 1);

    this.frame = scene.add.graphics().setDepth(DEPTH.HUD);
    this.frame.fillStyle(PALETTE_HEX.background, 0.92);
    this.frame.fillRoundedRect(x - 3, y - 3, width + 6, height + 6, 8);
    this.frame.lineStyle(2, PALETTE_HEX.gold, 0.85);
    this.frame.strokeRoundedRect(x - 3, y - 3, width + 6, height + 6, 8);
    this.frame.fillStyle(FX_COLORS.barTrack, 1);
    this.frame.fillRoundedRect(x, y, width, height, 5);
    this.frame.lineStyle(1, FX_COLORS.barBorder, 0.9);
    this.frame.strokeRoundedRect(x, y, width, height, 5);
    this.frame.fillStyle(0x000000, 0.45);
    this.frame.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, 4);

    this.fillGlow = scene.add
      .image(x + PADDING, y + height / 2, RUNTIME_TEXTURES.SOFT_GLOW)
      .setOrigin(0, 0.5)
      .setTint(PALETTE_HEX.orange)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.HUD + 1)
      .setVisible(false);

    this.fill = scene.add
      .image(x + PADDING, y + PADDING, RUNTIME_TEXTURES.PROGRESS_GRADIENT)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD + 2)
      .setVisible(false);

    this.setProgress(0);
  }

  setProgress(value: number): void {
    this.progress = clamp(value, 0, 1);
    const filled = Math.round(this.innerWidth * this.progress);
    const visible = filled > 0;

    this.fill.setVisible(visible);
    this.fillGlow.setVisible(visible);
    if (visible) {
      this.fill.setDisplaySize(filled, this.innerHeight);
      this.fillGlow.setDisplaySize(filled + 20, LOADING_LAYOUT.bar.height + 26);
    }
  }

  get value(): number {
    return this.progress;
  }

  /** Short celebratory pulse once loading is genuinely complete. */
  flash(): void {
    this.scene.tweens.add({
      targets: this.frameGlow,
      alpha: { from: 0.17, to: 0.6 },
      duration: 190,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.fillGlow,
      alpha: { from: 0.3, to: 0.78 },
      duration: 190,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }
}
