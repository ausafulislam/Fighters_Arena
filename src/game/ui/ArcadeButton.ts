import Phaser from 'phaser';

import { WELCOME_DEPTH } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import type { ButtonVariant } from '@/types/welcome';
import { addIcon } from '@/utils/icons';
import { addUiText } from '@/utils/typography';
import type { UiIcon } from '@/utils/icons';
import { MENU_FONT } from '@/utils/fonts';
import { lerp } from '@/utils/math';
import { octagon } from '@/utils/shapes';
import { RUNTIME_TEXTURES } from '@/utils/textures';

export interface ArcadeButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  variant: ButtonVariant;
  icon?: UiIcon;
  iconTint?: number;
  fontSize?: number;
  /** When set, the button lives inside this container (popup controls). */
  parent?: Phaser.GameObjects.Container;
  onSelect: () => void;
  onHover?: (hovered: boolean) => void;
}

/**
 * Sharp-cornered arcade button with a dark metallic body, layered borders and
 * an additive orange glow. Hover / selection / press are smoothed per frame so
 * no tween chains accumulate. Used by the main menu and the popup CLOSE button.
 */
export class ArcadeButton {
  private readonly scene: Phaser.Scene;
  private readonly options: ArcadeButtonOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly icon: Phaser.GameObjects.Image | null;

  private enabled = true;
  private hovered = false;
  private selected = false;
  private pressed = false;
  private pressTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, options: ArcadeButtonOptions) {
    this.scene = scene;
    this.options = options;
    const { x, y, width, height, variant, label } = options;

    this.container = scene.add.container(x, y).setDepth(WELCOME_DEPTH.MENU);

    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(variant === 'primary' ? PALETTE_HEX.orange : PALETTE_HEX.gold)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width + 36, height + 32)
      .setAlpha(0);

    this.frame = scene.add.graphics();

    this.icon =
      options.icon === undefined
        ? null
        : addIcon(
            scene,
            -width / 2 + 26,
            0,
            options.icon,
            18,
            options.iconTint ?? PALETTE_HEX.white,
          );

    const size = options.fontSize ?? (variant === 'primary' ? 17 : variant === 'compact' ? 11 : 15);
    this.label = addUiText(scene, options.icon === undefined ? 0 : 12, 0, label, {
      fontFamily: MENU_FONT,
      fontSize: `${size}px`,
      fontStyle: 'normal',
      color: '#FFFFFF',
      stroke: variant === 'primary' ? '#7A2000' : '#101014',
      strokeThickness: variant === 'compact' ? 2 : 3,
    })
      .setOrigin(0.5)
      .setShadow(0, 1, '#000000', 3, false, true);

    this.container.add([this.glow, this.frame]);
    if (this.icon) this.container.add(this.icon);
    this.container.add(this.label);
    if (options.parent) options.parent.add(this.container);

    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_OVER, this.onOver, this);
    this.container.on(Phaser.Input.Events.POINTER_OUT, this.onOut, this);
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.container.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onOut, this);

    this.refresh();
  }

  private readonly onOver = (): void => {
    if (!this.enabled) return;
    this.hovered = true;
    this.options.onHover?.(true);
    this.refresh();
  };

  private readonly onOut = (): void => {
    this.pressed = false;
    if (!this.hovered) return;
    this.hovered = false;
    this.options.onHover?.(false);
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
    this.options.onSelect();
  };

  /** Visual press feedback; safe to call from keyboard activation. */
  press(): void {
    this.pressed = true;
    this.pressTimer?.remove();
    this.pressTimer = this.scene.time.delayedCall(120, () => {
      this.pressed = false;
      this.pressTimer = null;
    });
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.hovered = false;
      this.pressed = false;
    }
    this.refresh();
  }

  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.refresh();
  }

  update(timeMs: number): void {
    const emphasis = this.hovered || this.selected;
    const pulse = this.options.variant === 'primary' ? (Math.sin(timeMs * 0.0022) + 1) * 0.5 : 0;
    const base = this.options.variant === 'primary' ? 0.2 + pulse * 0.18 : 0;
    const target = this.enabled ? Math.min(0.82, base + (emphasis ? 0.44 : 0)) : 0;
    this.glow.setAlpha(lerp(this.glow.alpha, target, 0.14));

    const scaleGoal = !this.enabled ? 1 : this.pressed ? 0.975 : emphasis ? 1.035 : 1;
    this.container.setScale(lerp(this.container.scaleX, scaleGoal, 0.22));
  }

  private refresh(): void {
    const { width, height, variant } = this.options;
    const emphasis = this.hovered || this.selected;
    const cut = variant === 'compact' ? 5 : 7;
    const g = this.frame;
    g.clear();

    // Drop shadow.
    g.fillStyle(0x000000, 0.55);
    g.fillPoints(octagon(width, height, cut, 1, 2), true);

    const body = variant === 'primary' ? 0xff5a00 : emphasis && this.enabled ? 0x353241 : 0x22212b;
    g.fillStyle(body, 1);
    g.fillPoints(octagon(width, height, cut), true);

    // Two crisp horizontal tones instead of a smooth gradient: a fan-triangled
    // polygon gradient leaves a visible diagonal seam on large panels.
    const bandHeight = Math.max(2, height / 2 - 2);
    g.fillStyle(variant === 'primary' ? 0xffa02a : 0x3e3b4c, variant === 'primary' ? 0.34 : 0.32);
    g.fillRect(-width / 2 + cut, -height / 2 + 2, width - 2 * cut, bandHeight);
    g.fillStyle(variant === 'primary' ? 0xb62a00 : 0x101014, variant === 'primary' ? 0.24 : 0.22);
    g.fillRect(-width / 2 + cut, 0, width - 2 * cut, bandHeight);

    // Top sheen strip.
    g.fillStyle(0xffffff, variant === 'primary' ? 0.14 : 0.06);
    g.fillRect(-width / 2 + cut + 2, -height / 2 + 2, width - 2 * cut - 4, 2);

    const outer =
      variant === 'primary'
        ? PALETTE_HEX.gold
        : variant === 'compact'
          ? PALETTE_HEX.orange
          : emphasis && this.enabled
            ? PALETTE_HEX.orange
            : 0x6b637d;
    g.lineStyle(2, outer, 1);
    g.strokePoints(octagon(width, height, cut), true);

    g.lineStyle(
      1,
      variant === 'primary' ? 0xffe0a0 : emphasis && this.enabled ? PALETTE_HEX.gold : 0x3a3648,
      variant === 'primary' ? 1 : 0.8,
    );
    g.strokePoints(octagon(width - 8, height - 8, Math.max(2, cut - 2)), true);

    // Small corner accents give the wide metallic frames their arcade cut.
    // Compact popup buttons are too short for them to read as intentional.
    if (variant !== 'compact') {
      g.lineStyle(1, PALETTE_HEX.gold, variant === 'primary' || emphasis ? 0.85 : 0.35);
      g.beginPath();
      g.moveTo(-width / 2 + cut + 4, -height / 2 + 4);
      g.lineTo(-width / 2 + cut + 12, -height / 2 + 4);
      g.moveTo(width / 2 - cut - 12, height / 2 - 4);
      g.lineTo(width / 2 - cut - 4, height / 2 - 4);
      g.strokePath();
    }

    this.label.setAlpha(this.enabled ? 1 : 0.6);
    if (this.icon) {
      this.icon.setTint(
        emphasis && this.enabled ? PALETTE_HEX.gold : (this.options.iconTint ?? PALETTE_HEX.white),
      );
      this.icon.setAlpha(this.enabled ? 1 : 0.6);
    }
    if (!this.enabled) this.glow.setAlpha(0);
  }

  destroy(): void {
    this.pressTimer?.remove();
    this.container.destroy();
  }
}
