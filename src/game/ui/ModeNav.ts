import Phaser from 'phaser';

import { MODE_DEPTH, MODE_LAYOUT } from '@/constants/gameModes';
import { PALETTE_HEX } from '@/constants/palette';
import { addIcon } from '@/utils/icons';
import { lerp } from '@/utils/math';
import { hexagon } from '@/utils/shapes';
import { RUNTIME_TEXTURES } from '@/utils/textures';

/** A gold hexagonal HUD badge. Only `interactive` badges get input handlers. */
function drawBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(MODE_DEPTH.HUD);
  const cut = 6;
  g.fillStyle(0x000000, 0.55);
  g.fillPoints(hexagon(width, height, cut, x + 1, y + 2), true);
  g.fillStyle(0x23212c, 1);
  g.fillPoints(hexagon(width, height, cut, x, y), true);
  g.lineStyle(2, PALETTE_HEX.gold, 1);
  g.strokePoints(hexagon(width, height, cut, x, y), true);
  g.lineStyle(1, PALETTE_HEX.deepOrange, 0.75);
  g.strokePoints(hexagon(width - 6, height - 6, 4, x, y), true);
  return g;
}

/**
 * Top-left Back (the only working navigation control) and two visual-only
 * volume / fullscreen badges. The badges have no input handlers at all, so
 * they cannot suggest unfinished audio or fullscreen features.
 */
export class ModeNav {
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly onBack: () => void,
  ) {
    const { back, hud } = MODE_LAYOUT;

    // --- Visual-only corner icons -------------------------------------------
    for (const badge of hud.icons) {
      drawBadge(scene, badge.x, hud.y, hud.width, hud.height);
      addIcon(scene, badge.x, hud.y, badge.icon, 15, PALETTE_HEX.gold).setDepth(MODE_DEPTH.HUD + 1);
    }

    // --- Back button ---------------------------------------------------------
    this.container = scene.add.container(back.x, back.y).setDepth(MODE_DEPTH.HUD);
    this.glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(back.width + 24, back.height + 22)
      .setAlpha(0);
    const frame = scene.add.graphics();
    const pts = hexagon(back.width, back.height, 7);
    frame.fillStyle(0x000000, 0.55);
    frame.fillPoints(hexagon(back.width, back.height, 7, 1, 2), true);
    frame.fillStyle(0x2a2118, 1);
    frame.fillPoints(pts, true);
    frame.lineStyle(2.5, PALETTE_HEX.gold, 1);
    frame.strokePoints(pts, true);
    frame.lineStyle(1, PALETTE_HEX.orange, 0.8);
    frame.strokePoints(hexagon(back.width - 7, back.height - 7, 5), true);

    this.icon = addIcon(scene, -1, 0, 'arrow-left', 18, PALETTE_HEX.gold);
    this.container.add([this.glow, frame, this.icon]);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-back.width / 2, -back.height / 2, back.width, back.height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_OVER, this.onOver, this);
    this.container.on(Phaser.Input.Events.POINTER_OUT, this.onOut, this);
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.container.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
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

  private readonly onUp = (): void => {
    if (!this.enabled || !this.pressed) return;
    this.pressed = false;
    this.onBack();
  };

  /** Keyboard activation (Escape / Backspace) mirrors a pointer press. */
  trigger(): void {
    if (!this.enabled) return;
    this.pressed = true;
    this.onBack();
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.hovered = false;
      this.pressed = false;
      document.body.style.cursor = '';
    }
  }

  update(timeMs: number): void {
    const target = !this.enabled ? 0 : this.hovered ? 0.55 + Math.sin(timeMs * 0.004) * 0.08 : 0.08;
    this.glow.setAlpha(lerp(this.glow.alpha, target, 0.18));
    const scale = !this.enabled ? 1 : this.pressed ? 0.96 : this.hovered ? 1.06 : 1;
    this.container.setScale(lerp(this.container.scaleX, scale, 0.22));
    this.icon.setTint(this.hovered && this.enabled ? PALETTE_HEX.white : PALETTE_HEX.gold);
  }

  destroy(): void {
    this.container.destroy();
    document.body.style.cursor = '';
  }
}
