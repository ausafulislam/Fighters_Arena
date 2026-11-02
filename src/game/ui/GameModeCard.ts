import Phaser from 'phaser';

import { MODE_CONFIG, MODE_DEPTH, MODE_LAYOUT, cardCenterX } from '@/constants/gameModes';
import { PALETTE_HEX } from '@/constants/palette';
import type { GameModeConfig } from '@/types/gameModes';
import { addIcon } from '@/utils/icons';
import { MENU_FONT, DISPLAY_FONT } from '@/utils/fonts';
import { lerp } from '@/utils/math';
import { drawDiamond, octagon } from '@/utils/shapes';
import { addUiText } from '@/utils/typography';
import { RUNTIME_TEXTURES } from '@/utils/textures';

export interface GameModeCardCallbacks {
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

/**
 * One display-only mode card. Art is a separate 2x-authored plate; frame chrome
 * is vector Graphics; icons are Lucide SVGs; labels are supersampled Phaser
 * Text. Hover and selection are smoothed per frame so no tween chains build up.
 */
export class GameModeCard {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly width: number;
  private readonly height: number;
  private readonly cut: number;

  private selected = false;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly config: GameModeConfig,
    private readonly index: number,
    private readonly callbacks: GameModeCardCallbacks,
  ) {
    this.scene = scene;
    const L = MODE_LAYOUT.cards;
    this.width = L.width;
    this.height = L.height;
    this.cut = L.cut;

    const x = cardCenterX(index);
    this.container = scene.add.container(x, L.centerY).setDepth(MODE_DEPTH.CARDS + index);

    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(this.width + 34, this.height + 30)
      .setAlpha(0);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.55);
    shadow.fillPoints(octagon(this.width, this.height, this.cut, 2, 4), true);

    const art = scene.add.image(0, 0, config.textureKey).setDisplaySize(this.width, this.height);

    this.frame = scene.add.graphics();
    this.icon = addIcon(scene, 0, 42, config.icon, 20, PALETTE_HEX.white);

    this.subtitle = addUiText(scene, 0, 61, config.shortDescription, {
      fontFamily: MENU_FONT,
      fontSize: '9px',
      color: '#D9D2E6',
      stroke: '#0B0810',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.title = addUiText(scene, 0, 80, config.title, {
      fontFamily: DISPLAY_FONT,
      fontSize: '12px',
      color: '#FFFFFF',
      stroke: '#0B0810',
      strokeThickness: 2,
      letterSpacing: 0.6,
    }).setOrigin(0.5);

    this.fitText(this.subtitle, this.width - 18, 9);
    this.fitText(this.title, this.width - 24, 12);

    this.container.add([this.glow, shadow, art, this.frame, this.icon, this.subtitle, this.title]);

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

  /** Never let a label overlap the frame - reduce size instead of wrapping. */
  private fitText(text: Phaser.GameObjects.Text, maxWidth: number, startSize: number): void {
    let size = startSize;
    text.setFontSize(size);
    while (text.width > maxWidth && size > 7) {
      size -= 0.5;
      text.setFontSize(size);
    }
  }

  private readonly onOver = (): void => {
    if (!this.enabled) return;
    this.hovered = true;
    this.callbacks.onHover(this.index);
    this.refresh();
  };

  private readonly onOut = (): void => {
    this.pressed = false;
    if (!this.hovered) return;
    this.hovered = false;
    this.callbacks.onHover(null);
    this.refresh();
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

  /** Keyboard / programmatic activation shares the pointer feedback. */
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
    return this.config.title;
  }

  update(timeMs: number): void {
    const scaleTarget = !this.enabled
      ? 1
      : this.pressed
        ? 0.985
        : this.hovered
          ? MODE_CONFIG.HOVER_SCALE
          : this.selected
            ? MODE_CONFIG.SELECTED_SCALE
            : 1;
    this.container.setScale(lerp(this.container.scaleX, scaleTarget, 0.2));

    const pulse = (Math.sin(timeMs * 0.0022) + 1) * 0.5;
    const glowTarget = !this.enabled
      ? 0
      : this.selected
        ? 0.48 + pulse * 0.14
        : this.hovered
          ? 0.34
          : 0;
    this.glow.setAlpha(lerp(this.glow.alpha, glowTarget, 0.14));
  }

  private refresh(): void {
    const w = this.width;
    const h = this.height;
    const c = this.cut;
    const g = this.frame;
    g.clear();

    // A slim top sheen keeps the plate from looking flat.
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(-w / 2 + c, -h / 2 + 2, w - 2 * c, 2);

    // Title plate: one consistent octagon shape for all four cards.
    g.fillStyle(0x000000, 0.55);
    g.fillPoints(octagon(118, 21, 6, 1, 81), true);
    g.fillStyle(0x14121c, 0.97);
    g.fillPoints(octagon(118, 21, 6, 0, 80), true);
    g.lineStyle(1, this.selected ? PALETTE_HEX.orange : 0x5b546c, 0.95);
    g.strokePoints(octagon(118, 21, 6, 0, 80), true);

    // Frame border thickness is identical everywhere; only the colour changes.
    const outer = this.selected ? PALETTE_HEX.gold : this.hovered ? PALETTE_HEX.orange : 0x6b637d;
    g.lineStyle(this.selected ? 3 : 2, outer, 1);
    g.strokePoints(octagon(w, h, c), true);
    g.lineStyle(1, this.selected ? PALETTE_HEX.orange : 0x211f2b, 0.9);
    g.strokePoints(octagon(w - 6, h - 6, c - 2), true);

    if (this.selected) {
      // A small orange tab plus two diamonds mark the selected state clearly.
      g.fillStyle(PALETTE_HEX.orange, 1);
      g.fillPoints(octagon(42, 5, 2, 0, -h / 2 + 2), true);
      drawDiamond(g, -w / 2 + c / 2, -h / 2 + c / 2, 2.5, PALETTE_HEX.gold);
      drawDiamond(g, w / 2 - c / 2, -h / 2 + c / 2, 2.5, PALETTE_HEX.gold);
    }

    this.icon.setTint(this.selected ? PALETTE_HEX.gold : PALETTE_HEX.white);
    this.icon.setAlpha(this.enabled ? 1 : 0.6);
    this.title.setAlpha(this.enabled ? 1 : 0.6);
    this.subtitle.setAlpha(this.enabled ? 1 : 0.6);
  }

  destroy(): void {
    this.container.destroy();
  }
}
