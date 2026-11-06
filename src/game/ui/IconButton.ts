import Phaser from 'phaser';

import { PALETTE_HEX } from '@/constants/palette';
import { addIcon } from '@/utils/icons';
import type { UiIcon } from '@/utils/icons';
import { lerp } from '@/utils/math';
import { hexagon } from '@/utils/shapes';
import { createSoftGlowTexture, RUNTIME_TEXTURES } from '@/utils/textures';

export interface IconButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  icon: UiIcon;
  iconSize?: number;
  depth: number;
  tint?: number;
  onSelect: () => void;
}

/** One consistent, sharp SVG icon button used by every Phase 6 screen. */
export class IconButton {
  private readonly options: IconButtonOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly iconImage: Phaser.GameObjects.Image;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, options: IconButtonOptions) {
    this.options = options;
    const { x, y, width, height, icon, depth } = options;
    createSoftGlowTexture(scene);

    this.container = scene.add.container(x, y).setDepth(depth);
    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width + 22, height + 20)
      .setAlpha(0);

    const frame = scene.add.graphics();
    frame.fillStyle(0x000000, 0.55);
    frame.fillPoints(hexagon(width, height, 5, 1, 2), true);
    frame.fillStyle(0x1d1a26, 1);
    frame.fillPoints(hexagon(width, height, 5), true);
    frame.lineStyle(2, PALETTE_HEX.gold, 0.95);
    frame.strokePoints(hexagon(width, height, 5), true);
    frame.lineStyle(1, PALETTE_HEX.deepOrange, 0.7);
    frame.strokePoints(hexagon(width - 5, height - 5, 4), true);

    this.iconImage = addIcon(
      scene,
      0,
      0,
      icon,
      options.iconSize ?? Math.min(width, height) - 8,
      options.tint ?? PALETTE_HEX.gold,
    );
    this.container.add([this.glow, frame, this.iconImage]);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.container.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (this.enabled) this.hovered = true;
    });
    this.container.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.hovered = false;
      this.pressed = false;
    });
    this.container.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.enabled) this.pressed = true;
    });
    this.container.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!this.enabled || !this.pressed) return;
      this.pressed = false;
      this.options.onSelect();
    });
    this.container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.pressed = false;
    });
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.hovered = false;
      this.pressed = false;
    }
  }

  /** Keyboard / automated-test activation follows the same path as a click. */
  press(): void {
    if (this.enabled) this.options.onSelect();
  }

  update(timeMs: number): void {
    const target = this.enabled ? (this.hovered ? 0.5 + Math.sin(timeMs * 0.005) * 0.08 : 0) : 0;
    this.glow.setAlpha(lerp(this.glow.alpha, target, 0.2));
    const scale = !this.enabled ? 1 : this.pressed ? 0.94 : this.hovered ? 1.07 : 1;
    this.container.setScale(lerp(this.container.scaleX, scale, 0.22));
  }

  destroy(): void {
    this.container.destroy();
  }
}
