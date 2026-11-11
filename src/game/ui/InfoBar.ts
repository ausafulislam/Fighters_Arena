import type Phaser from 'phaser';

import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { drawDiamond, octagon } from '@/utils/shapes';
import { tracked } from '@/utils/typography';

export interface InfoBarLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cut: number;
}

export interface InfoBarOptions {
  layout: InfoBarLayout;
  depth: number;
  fadeMs: number;
}

/** Shared bottom information panel with a short cross-fade on copy changes. */
export class InfoBar {
  protected readonly scene: Phaser.Scene;
  protected readonly text: Phaser.GameObjects.Text;
  protected readonly maxWidth: number;
  protected readonly fadeMs: number;
  private tween: Phaser.Tweens.Tween | null = null;
  private value = '';

  constructor(scene: Phaser.Scene, options: InfoBarOptions) {
    this.scene = scene;
    this.fadeMs = options.fadeMs;
    const { x, y, width, height, cut } = options.layout;
    this.maxWidth = width - 46;

    const g = scene.add.graphics().setDepth(options.depth);
    g.fillStyle(0x000000, 0.6);
    g.fillPoints(octagon(width, height, cut, x + 2, y + 3), true);
    g.fillStyle(0x14121c, 0.96);
    g.fillPoints(octagon(width, height, cut, x, y), true);
    g.fillStyle(PALETTE_HEX.deepPurple, 0.22);
    g.fillRect(x - width / 2 + cut + 4, y - height / 2 + 3, width - 2 * cut - 8, height - 6);
    g.lineStyle(1.5, PALETTE_HEX.orange, 1);
    g.strokePoints(octagon(width, height, cut, x, y), true);
    g.lineStyle(1, PALETTE_HEX.gold, 0.6);
    g.strokePoints(octagon(width - 8, height - 8, cut - 3, x, y), true);
    drawDiamond(g, x - width / 2 + 2, y, 4, PALETTE_HEX.gold);
    drawDiamond(g, x + width / 2 - 2, y, 4, PALETTE_HEX.gold);

    this.text = tracked(
      scene,
      x,
      y,
      '',
      {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '12px',
        color: '#FFFFFF',
      },
      0.6,
    )
      .setOrigin(0.5)
      .setDepth(options.depth + 1)
      .setShadow(0, 1, '#000000', 2, false, true);
  }

  /** Shrinks tracking/size if a phrase would ever exceed the bar. */
  protected fit(value: string): void {
    this.text.setText(value);
    let size = 12;
    while (this.text.width > this.maxWidth && size > 9) {
      size -= 0.5;
      this.text.setFontSize(size);
    }
    this.text.setFontSize(size);
  }

  setDescription(value: string, immediate = false): void {
    if (value === this.value) return;
    this.value = value;
    this.tween?.remove();
    if (immediate) {
      this.fit(value);
      this.text.setAlpha(1);
      return;
    }
    this.tween = this.scene.tweens.add({
      targets: this.text,
      alpha: 0,
      duration: this.fadeMs / 2,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.fit(value);
        this.tween = this.scene.tweens.add({
          targets: this.text,
          alpha: 1,
          duration: this.fadeMs,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  get description(): string {
    return this.value;
  }
}
