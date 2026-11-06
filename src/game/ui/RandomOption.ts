import Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { CHARACTER_DEPTH, CHARACTER_LAYOUT } from '@/constants/characters';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_FONT, DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { addIcon } from '@/utils/icons';
import { lerp } from '@/utils/math';
import { drawDiamond, octagon } from '@/utils/shapes';
import { addUiText } from '@/utils/typography';
import { RUNTIME_TEXTURES } from '@/utils/textures';

/**
 * Right-side mystery pick. A hooded silhouette, a large SVG question mark and
 * the RANDOM label; the whole panel is a single hit area for mouse and touch.
 * The scene decides the actual random selection, so no duplicate logic lives
 * in this view.
 */
export class RandomOption {
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly iconGlow: Phaser.GameObjects.Image;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, onSelect: () => void) {
    const L = CHARACTER_LAYOUT.random;
    this.container = scene.add.container(L.x, L.y).setDepth(CHARACTER_DEPTH.RANDOM);

    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.purple)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(L.width + 50, L.height + 30)
      .setAlpha(0.12);

    const silhouette = scene.add
      .image(0, 0, TEXTURE_KEYS.RANDOM_SILHOUETTE)
      .setScale(0.5)
      .setAlpha(0.96);

    const iconY = L.iconY - L.y;
    this.iconGlow = scene.add
      .image(0, iconY, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(0xb36bff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(74, 74)
      .setAlpha(0.5);
    const question = addIcon(scene, 0, iconY, 'circle-help', 38, 0xc77bff).setAlpha(0.95);

    const labelY = L.labelY - L.y;
    const plate = scene.add.graphics();
    plate.fillStyle(0x0b0812, 0.94);
    plate.fillPoints(octagon(126, 24, 8, 0, labelY), true);
    plate.lineStyle(2, PALETTE_HEX.purple, 1);
    plate.strokePoints(octagon(126, 24, 8, 0, labelY), true);
    plate.lineStyle(1, PALETTE_HEX.orange, 0.8);
    plate.strokePoints(octagon(118, 17, 5, 0, labelY), true);
    drawDiamond(plate, -63, labelY, 3, PALETTE_HEX.gold);
    drawDiamond(plate, 63, labelY, 3, PALETTE_HEX.gold);

    const label = addUiText(scene, 8, labelY - 1, 'RANDOM', {
      fontFamily: DISPLAY_FONT,
      fontStyle: 'italic',
      fontSize: '16px',
      color: '#FFFFFF',
      stroke: '#1A0A26',
      strokeThickness: 3,
      letterSpacing: 1,
    })
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 3, false, true);
    const shuffle = addIcon(scene, -46, labelY, 'shuffle', 13, PALETTE_HEX.gold);

    const hint = addUiText(scene, 0, labelY + 20, 'MYSTERY FIGHTER', {
      fontFamily: DISPLAY_MEDIUM_FONT,
      fontSize: '8px',
      color: '#B9A9D6',
      letterSpacing: 0.8,
    }).setOrigin(0.5);

    this.container.add([
      this.glow,
      silhouette,
      this.iconGlow,
      question,
      plate,
      shuffle,
      label,
      hint,
    ]);

    const hitWidth = L.width;
    const hitHeight = L.height + 34;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_OVER, this.onOver, this);
    this.container.on(Phaser.Input.Events.POINTER_OUT, this.onOut, this);
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.container.on(Phaser.Input.Events.POINTER_UP, this.onUp(onSelect), this);
    this.container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onOut, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private readonly onOver = (): void => {
    if (!this.enabled) return;
    this.hovered = true;
    document.body.style.cursor = 'pointer';
  };

  private readonly onOut = (): void => {
    this.hovered = false;
    this.pressed = false;
    document.body.style.cursor = '';
  };

  private readonly onDown = (): void => {
    if (!this.enabled) return;
    this.pressed = true;
  };

  private readonly onUp = (onSelect: () => void) => (): void => {
    if (!this.enabled || !this.pressed) return;
    this.pressed = false;
    onSelect();
  };

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.hovered = false;
      this.pressed = false;
      document.body.style.cursor = '';
    }
  }

  update(timeMs: number): void {
    const pulse = (Math.sin(timeMs * 0.0022) + 1) * 0.5;
    const target = !this.enabled ? 0.08 : this.hovered ? 0.48 + pulse * 0.1 : 0.16 + pulse * 0.06;
    this.glow.setAlpha(lerp(this.glow.alpha, target, 0.14));
    this.iconGlow.setAlpha(lerp(this.iconGlow.alpha, this.hovered ? 0.72 : 0.5, 0.14));
    const scale = !this.enabled ? 1 : this.pressed ? 0.98 : this.hovered ? 1.03 : 1;
    this.container.setScale(lerp(this.container.scaleX, scale, 0.2));
  }

  destroy(): void {
    document.body.style.cursor = '';
  }
}
