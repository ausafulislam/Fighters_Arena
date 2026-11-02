import type Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { DEPTH, LOADING_CONFIG, LOADING_LAYOUT } from '@/constants/loading';

/** Central wordmark with a subtle entrance settle and a slow floating idle. */
export class LogoMark {
  private readonly scene: Phaser.Scene;
  private image: Phaser.GameObjects.Image | null = null;
  private readonly baseY = LOADING_LAYOUT.logo.y;
  private entranceDone = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  reveal(): void {
    if (this.image || !this.scene.textures.exists(TEXTURE_KEYS.LOGO)) return;
    this.image = this.scene.add
      .image(LOADING_LAYOUT.logo.x, this.baseY, TEXTURE_KEYS.LOGO)
      .setDepth(DEPTH.LOGO);
  }

  playEntrance(): void {
    if (!this.image) return;
    this.image.setScale(0.86).setAlpha(0.3).setAngle(-1.5);
    this.scene.tweens.add({
      targets: this.image,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      angle: 0,
      duration: LOADING_CONFIG.LOGO_ENTRANCE_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.entranceDone = true;
      },
    });
  }

  update(timeMs: number): void {
    if (!this.image || !this.entranceDone) return;
    this.image.setY(Math.round(this.baseY + Math.sin(timeMs * 0.0011) * 1.2));
  }
}
