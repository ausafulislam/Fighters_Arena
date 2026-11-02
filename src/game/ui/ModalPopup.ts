import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { pointerToLogical } from '@/utils/camera';
import { WELCOME_CONFIG, WELCOME_DEPTH } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import type { PopupCloseReason } from '@/types/welcome';
import { DISPLAY_FONT } from '@/utils/fonts';
import { drawDiamond, octagon } from '@/utils/shapes';
import { addUiText } from '@/utils/typography';

export interface ModalPopupOptions {
  width: number;
  height: number;
  title: string;
  onDismiss: (reason: PopupCloseReason) => void;
}

/**
 * Reusable modal shell: full-screen dimming, sharp orange/purple framed panel,
 * a subtle scale/alpha entrance and exit, outside-click and Escape dismissal.
 * Subclasses only build their content, so both popups share one interaction
 * contract and cannot drift apart.
 */
export abstract class ModalPopup {
  protected readonly scene: Phaser.Scene;
  protected readonly panel: Phaser.GameObjects.Container;
  protected readonly width: number;
  protected readonly height: number;

  private readonly options: ModalPopupOptions;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private closing = false;

  constructor(scene: Phaser.Scene, options: ModalPopupOptions) {
    this.scene = scene;
    this.options = options;
    this.width = options.width;
    this.height = options.height;

    this.dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x08060d, 1)
      .setDepth(WELCOME_DEPTH.POPUP_DIM)
      .setAlpha(0);

    this.panel = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(WELCOME_DEPTH.POPUP)
      .setAlpha(0)
      .setScale(0.9);

    const frame = scene.add.graphics();
    this.drawFrame(frame);
    this.panel.add(frame);

    const title = addUiText(scene, 0, -this.height / 2 + 21, options.title, {
      fontFamily: DISPLAY_FONT,
      fontSize: '15px',
      color: '#FFC247',
    })
      .setOrigin(0.5)
      .setShadow(0, 1, '#000000', 3, false, true);
    this.panel.add(title);

    const accents = scene.add.graphics();
    accents.lineStyle(1, PALETTE_HEX.orange, 0.85);
    accents.beginPath();
    accents.moveTo(-this.width / 2 + 26, -this.height / 2 + 37);
    accents.lineTo(this.width / 2 - 26, -this.height / 2 + 37);
    accents.strokePath();
    drawDiamond(accents, -this.width / 2 + 24, -this.height / 2 + 37, 3, PALETTE_HEX.gold);
    drawDiamond(accents, this.width / 2 - 24, -this.height / 2 + 37, 3, PALETTE_HEX.gold);
    this.panel.add(accents);

    this.buildContent(this.panel);

    // The dim is intentionally NOT interactive: a scene-level pointer listener
    // with a panel-bounds guard handles outside clicks, so popup controls are
    // never out-ranked by an overlay in Phaser's topOnly input sorting.
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.keyboard?.on('keydown-ESC', this.onEscape, this);

    scene.tweens.add({
      targets: this.dim,
      alpha: WELCOME_CONFIG.POPUP_DIM_ALPHA,
      duration: 180,
      ease: 'Sine.easeOut',
    });
    scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: WELCOME_CONFIG.POPUP_IN_MS,
      ease: 'Back.easeOut',
    });
  }

  protected abstract buildContent(panel: Phaser.GameObjects.Container): void;

  private drawFrame(g: Phaser.GameObjects.Graphics): void {
    const w = this.width;
    const h = this.height;
    const cut = 12;

    g.fillStyle(0x000000, 0.6);
    g.fillPoints(octagon(w, h, cut, 3, 5), true);
    g.fillStyle(0x1d1c27, 1);
    g.fillPoints(octagon(w, h, cut), true);
    // Crisp horizontal panel tones: a fan-triangled polygon gradient produces
    // a visible diagonal seam, which reads as a rendering artefact.
    g.fillStyle(0x2a2738, 0.6);
    g.fillRect(-w / 2 + cut, -h / 2 + 3, w - 2 * cut, h / 2 - 3);
    g.fillStyle(0x101014, 0.4);
    g.fillRect(-w / 2 + cut, 0, w - 2 * cut, h / 2 - 3);

    g.lineStyle(3, PALETTE_HEX.deepPurple, 1);
    g.strokePoints(octagon(w, h, cut), true);
    g.lineStyle(1.5, PALETTE_HEX.orange, 1);
    g.strokePoints(octagon(w - 7, h - 7, cut - 2), true);

    // Gold corner diamonds complete the arcade frame.
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        drawDiamond(g, sx * (w / 2 - cut / 2), sy * (h / 2 - cut / 2), 3, PALETTE_HEX.gold, 0.9);
      }
    }

    // Soft purple header band behind the title.
    g.fillStyle(PALETTE_HEX.deepPurple, 0.22);
    g.fillRect(-w / 2 + cut + 6, -h / 2 + 6, w - 2 * cut - 12, 30);
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.closing) return;
    const world = pointerToLogical(this.scene, pointer.x, pointer.y);
    const dx = Math.abs(world.x - GAME_WIDTH / 2);
    const dy = Math.abs(world.y - GAME_HEIGHT / 2);
    if (dx <= this.width / 2 && dy <= this.height / 2) return;
    this.close('outside');
  };

  private readonly onEscape = (): void => {
    this.close('escape');
  };

  /** Idempotent; reason is reported to the scene for state / diagnostics. */
  close(reason: PopupCloseReason = 'button'): void {
    if (this.closing) return;
    this.closing = true;

    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.scene.input.keyboard?.off('keydown-ESC', this.onEscape, this);

    this.scene.tweens.add({
      targets: this.dim,
      alpha: 0,
      duration: WELCOME_CONFIG.POPUP_OUT_MS,
    });
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 0,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: WELCOME_CONFIG.POPUP_OUT_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.dim.destroy();
        this.panel.destroy();
        this.options.onDismiss(reason);
      },
    });
  }
}
