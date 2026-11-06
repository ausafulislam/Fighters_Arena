import Phaser from 'phaser';

import { CHARACTER_CONFIG, CHARACTER_DEPTH, CHARACTER_LAYOUT } from '@/constants/characters';
import { PALETTE_HEX } from '@/constants/palette';
import type { CharacterConfig } from '@/types/characters';
import { DISPLAY_MEDIUM_FONT, MENU_FONT } from '@/utils/fonts';
import { lerp } from '@/utils/math';
import { drawDiamond, octagon } from '@/utils/shapes';
import { addUiText } from '@/utils/typography';
import { RUNTIME_TEXTURES } from '@/utils/textures';

export interface CharacterCardCallbacks {
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

/** One interactive roster card: themed 2x plate, sharp frame, name, P1 tag. */
export class CharacterCard {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly p1Tag: Phaser.GameObjects.Container;
  private readonly width: number;
  private readonly height: number;
  private readonly cut: number;

  private selected = false;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly config: CharacterConfig,
    private readonly index: number,
    x: number,
    y: number,
    private readonly callbacks: CharacterCardCallbacks,
  ) {
    this.scene = scene;
    const L = CHARACTER_LAYOUT.cards;
    this.width = L.width;
    this.height = L.height;
    this.cut = L.cut;

    this.container = scene.add.container(x, y).setDepth(CHARACTER_DEPTH.CARDS + index);

    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(this.width + 26, this.height + 24)
      .setAlpha(0);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.55);
    shadow.fillPoints(octagon(this.width, this.height, this.cut, 2, 3), true);

    const art = scene.add
      .image(0, 0, config.cardTextureKey)
      .setDisplaySize(this.width, this.height);

    this.frame = scene.add.graphics();

    this.name = addUiText(scene, 0, 23, config.name, {
      fontFamily: DISPLAY_MEDIUM_FONT,
      fontSize: '9px',
      color: '#FFFFFF',
      stroke: '#0B0810',
      strokeThickness: 2,
      letterSpacing: 0.5,
    }).setOrigin(0.5);
    this.fitText(this.name, this.width - 10, 9);

    // "P1" marker on the selected fighter, matching the reference plate.
    this.p1Tag = scene.add.container(-this.width / 2 + 13, -this.height / 2 + 10);
    const tag = scene.add.graphics();
    tag.fillStyle(0x101014, 0.95);
    tag.fillPoints(octagon(22, 13, 4), true);
    tag.lineStyle(1, PALETTE_HEX.gold, 1);
    tag.strokePoints(octagon(22, 13, 4), true);
    const tagText = addUiText(scene, 0, 0, 'P1', {
      fontFamily: MENU_FONT,
      fontSize: '10px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    this.p1Tag.add([tag, tagText]);
    this.p1Tag.setVisible(false);

    this.container.add([this.glow, shadow, art, this.frame, this.name, this.p1Tag]);

    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-this.width / 2, -this.height / 2, this.width, this.height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_OVER, this.onOver, this);
    this.container.on(Phaser.Input.Events.POINTER_OUT, this.onOut, this);
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.container.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onOut, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.refresh();
  }

  private fitText(text: Phaser.GameObjects.Text, maxWidth: number, startSize: number): void {
    let size = startSize;
    text.setFontSize(size);
    while (text.width > maxWidth && size > 6.5) {
      size -= 0.5;
      text.setFontSize(size);
    }
  }

  private readonly onOver = (): void => {
    if (!this.enabled) return;
    this.hovered = true;
    this.callbacks.onHover(this.index);
    document.body.style.cursor = 'pointer';
  };

  private readonly onOut = (): void => {
    this.pressed = false;
    if (this.hovered) {
      this.hovered = false;
      this.callbacks.onHover(null);
      document.body.style.cursor = '';
    }
  };

  private readonly onDown = (): void => {
    if (!this.enabled) return;
    this.pressed = true;
  };

  private readonly onUp = (): void => {
    if (!this.enabled || !this.pressed) return;
    this.pressed = false;
    this.press();
    this.callbacks.onSelect(this.index);
  };

  /** Keyboard / RANDOM activation shares the exact pointer feedback. */
  press(): void {
    this.pressed = true;
    this.scene.time.delayedCall(110, () => {
      this.pressed = false;
    });
  }

  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.refresh();
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.hovered = false;
      this.pressed = false;
    }
    this.refresh();
  }

  get isSelected(): boolean {
    return this.selected;
  }

  get label(): string {
    return this.config.name;
  }

  update(timeMs: number): void {
    const target = !this.enabled
      ? 1
      : this.pressed
        ? 0.985
        : this.hovered
          ? CHARACTER_CONFIG.HOVER_SCALE
          : this.selected
            ? CHARACTER_CONFIG.SELECTED_SCALE
            : 1;
    this.container.setScale(lerp(this.container.scaleX, target, 0.2));

    const pulse = (Math.sin(timeMs * 0.0022) + 1) * 0.5;
    const glowTarget = !this.enabled
      ? 0
      : this.selected
        ? 0.42 + pulse * 0.12
        : this.hovered
          ? 0.3
          : 0;
    this.glow.setAlpha(lerp(this.glow.alpha, glowTarget, 0.14));
  }

  private refresh(): void {
    const w = this.width;
    const h = this.height;
    const c = this.cut;
    const g = this.frame;
    g.clear();

    g.fillStyle(0xffffff, 0.05);
    g.fillRect(-w / 2 + c, -h / 2 + 2, w - 2 * c, 2);

    // Name plate at the bottom of every card (identical geometry).
    g.fillStyle(0x0b0912, 0.9);
    g.fillPoints(octagon(w - 8, 16, 4, 0, 24), true);
    g.lineStyle(1, this.selected ? PALETTE_HEX.orange : 0x4a445c, 0.9);
    g.strokePoints(octagon(w - 8, 16, 4, 0, 24), true);

    const outer = this.selected ? PALETTE_HEX.gold : this.hovered ? PALETTE_HEX.orange : 0x6b637d;
    g.lineStyle(this.selected ? 3 : 2, outer, 1);
    g.strokePoints(octagon(w, h, c), true);
    g.lineStyle(1, this.selected ? PALETTE_HEX.orange : 0x211f2b, 0.9);
    g.strokePoints(octagon(w - 5, h - 5, c - 2), true);

    if (this.selected) {
      g.fillStyle(PALETTE_HEX.orange, 1);
      g.fillPoints(octagon(28, 4, 2, 0, -h / 2 + 2), true);
      drawDiamond(g, -w / 2 + c / 2, -h / 2 + c / 2, 2.5, PALETTE_HEX.gold);
      drawDiamond(g, w / 2 - c / 2, -h / 2 + c / 2, 2.5, PALETTE_HEX.gold);
    }

    this.p1Tag.setVisible(this.selected);
    this.name.setAlpha(this.enabled ? 1 : 0.6);
  }

  destroy(): void {
    this.container.destroy();
  }
}
