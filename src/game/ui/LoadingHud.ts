import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { DEPTH, LOADING_CONFIG, LOADING_LAYOUT, LOADING_TIP } from '@/constants/loading';
import { FX_COLORS, PALETTE, PALETTE_HEX } from '@/constants/palette';
import { UI_FONT_STACK } from '@/utils/fonts';
import { createBottomVignetteTexture, RUNTIME_TEXTURES } from '@/utils/textures';
import { addUiText } from '@/utils/typography';

const PERCENTAGE_COLOR = '#FFFFFF';
const TIP_COLOR = '#F5F0FA';

/** Percentage readout, gameplay tip and gold diamond ornaments. */
export class LoadingHud {
  private readonly scene: Phaser.Scene;
  private readonly percentage: Phaser.GameObjects.Text;
  private readonly tipLabel: Phaser.GameObjects.Text;
  private readonly tipBody: Phaser.GameObjects.Text;
  private shownPercent = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { percentage, tip, ornaments } = LOADING_LAYOUT;

    createBottomVignetteTexture(scene, GAME_WIDTH, 76);
    scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT - 38, RUNTIME_TEXTURES.BOTTOM_VIGNETTE)
      .setDepth(DEPTH.HUD - 2);

    this.percentage = addUiText(scene, percentage.x, percentage.y, '0%', {
      fontFamily: UI_FONT_STACK,
      fontSize: '25px',
      color: PERCENTAGE_COLOR,
      stroke: '#20101E',
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD + 3)
      .setShadow(0, 2, '#000000', 4, false, true);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI_FONT_STACK,
      fontSize: '12px',
      color: PALETTE.gold,
    };
    const bodyStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI_FONT_STACK,
      fontSize: '12px',
      color: TIP_COLOR,
    };

    this.tipLabel = addUiText(scene, 0, tip.y, LOADING_TIP.label, labelStyle)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD + 3)
      .setShadow(0, 1, '#000000', 4, false, true);
    this.tipBody = addUiText(scene, 0, tip.y, LOADING_TIP.body, bodyStyle)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD + 3)
      .setShadow(0, 1, '#000000', 4, false, true);

    const total = this.tipLabel.width + this.tipBody.width;
    this.tipLabel.setX(LOADING_LAYOUT.background.x - total / 2);
    this.tipBody.setX(this.tipLabel.x + this.tipLabel.width);

    const decor = scene.add.graphics().setDepth(DEPTH.HUD + 2);
    decor.lineStyle(1, PALETTE_HEX.gold, 0.62);
    decor.beginPath();
    decor.moveTo(ornaments.left + 10, tip.y);
    decor.lineTo(ornaments.left + 40, tip.y);
    decor.moveTo(ornaments.right - 40, tip.y);
    decor.lineTo(ornaments.right - 10, tip.y);
    decor.strokePath();
    for (const cx of [ornaments.left, ornaments.right]) {
      const r = 4;
      decor.fillStyle(PALETTE_HEX.gold, 1);
      decor.fillPoints(
        [
          new Phaser.Geom.Point(cx, tip.y - r),
          new Phaser.Geom.Point(cx + r, tip.y),
          new Phaser.Geom.Point(cx, tip.y + r),
          new Phaser.Geom.Point(cx - r, tip.y),
        ],
        true,
      );
      decor.fillStyle(FX_COLORS.inkShadow, 0.9);
      decor.fillPoints(
        [
          new Phaser.Geom.Point(cx, tip.y - 1),
          new Phaser.Geom.Point(cx + 1, tip.y),
          new Phaser.Geom.Point(cx, tip.y + 1),
          new Phaser.Geom.Point(cx - 1, tip.y),
        ],
        true,
      );
    }
  }

  setProgress(value: number): void {
    const percent = Math.min(100, Math.floor(value * 100 + 0.0001));
    if (percent === this.shownPercent) return;
    this.shownPercent = percent;
    this.percentage.setText(`${percent}%`);
  }

  /** Brief emphasis at 100%. */
  pulse(): void {
    this.scene.tweens.add({
      targets: this.percentage,
      scale: { from: 1, to: 1.14 },
      duration: LOADING_CONFIG.COMPLETION_HOLD_MS / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }
}
