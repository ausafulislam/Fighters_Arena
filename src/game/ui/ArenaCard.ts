import Phaser from 'phaser';

import { ARENA_CONFIG } from '@/constants/arenas';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_MEDIUM_FONT, BODY_FONT } from '@/utils/fonts';
import { lerp } from '@/utils/math';
import { octagon } from '@/utils/shapes';
import { createSoftGlowTexture, RUNTIME_TEXTURES } from '@/utils/textures';
import { addUiText, tracked } from '@/utils/typography';
import type { ArenaConfig } from '@/types/arenas';

export interface ArenaCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

/** Consistent 108 x 146 arena plate with real selection / hover states. */
export class ArenaCard {
  private readonly config: ArenaConfig;
  private readonly index: number;
  private readonly options: ArenaCardOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly plate: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.Graphics;
  private hovered = false;
  private selected = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, config: ArenaConfig, index: number, options: ArenaCardOptions) {
    this.config = config;
    this.index = index;
    this.options = options;
    const { x, y, width, height, depth } = options;
    createSoftGlowTexture(scene);

    this.container = scene.add.container(x, y).setDepth(depth);
    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width + 40, height + 34)
      .setAlpha(0);

    this.plate = scene.add.image(0, 0, config.cardTextureKey).setDisplaySize(width, height);

    this.frame = scene.add.graphics();
    this.drawFrame(false);

    const name = tracked(
      scene,
      0,
      height / 2 - 30,
      config.name,
      {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '10px',
        color: '#FFFFFF',
      },
      0.2,
    )
      .setOrigin(0.5)
      .setShadow(0, 1, '#000000', 2, false, true);
    const category = addUiText(scene, 0, height / 2 - 16, config.category, {
      fontFamily: BODY_FONT,
      fontSize: '9px',
      color: '#FFC247',
    }).setOrigin(0.5);

    this.container.add([this.glow, this.plate, this.frame, name, category]);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (!this.enabled) return;
      this.hovered = true;
      this.options.onHover(this.index);
      document.body.style.cursor = 'pointer';
    });
    this.container.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.hovered = false;
      document.body.style.cursor = '';
    });
    this.container.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.enabled) this.container.setScale(0.985);
    });
    this.container.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!this.enabled) return;
      this.options.onSelect(this.index);
    });
    this.container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.container.setScale(1);
    });
  }

  private drawFrame(selected: boolean): void {
    const { width, height } = this.options;
    const g = this.frame;
    g.clear();
    g.lineStyle(selected ? 3 : 2, selected ? PALETTE_HEX.orange : 0x9b92a8, 1);
    g.strokePoints(octagon(width, height, 8), true);
    g.lineStyle(1, selected ? PALETTE_HEX.gold : this.config.accent, 0.85);
    g.strokePoints(octagon(width - 5, height - 5, 7), true);
  }

  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.drawFrame(value);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.hovered = false;
  }

  press(): void {
    if (this.enabled) this.options.onSelect(this.index);
  }

  update(timeMs: number): void {
    const live = this.enabled;
    const target = !live
      ? 0
      : this.selected
        ? 0.48 + Math.sin(timeMs * 0.004) * 0.07
        : this.hovered
          ? 0.26
          : 0;
    this.glow.setAlpha(lerp(this.glow.alpha, target, 0.16));
    const scale = !live
      ? 1
      : this.selected
        ? ARENA_CONFIG.SELECTED_SCALE
        : this.hovered
          ? ARENA_CONFIG.HOVER_SCALE
          : 1;
    this.container.setScale(lerp(this.container.scaleX, scale, 0.2));
    this.plate.setAlpha(this.selected ? 1 : 0.9);
  }

  destroy(): void {
    this.container.destroy();
  }
}
