import Phaser from 'phaser';

import { MATCH_DEPTH } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_FONT, BODY_FONT } from '@/utils/fonts';
import { octagon, drawDiamond } from '@/utils/shapes';
import { addUiText, tracked } from '@/utils/typography';
import type { Winner } from '@/game/match/MatchManager';

import { ArcadeButton } from './ArcadeButton';

export interface ResultHandlers {
  onRematch: () => void;
  onMainMenu: () => void;
}

/** End-of-match overlay: VICTORY / DEFEAT, winner name, REMATCH, MAIN MENU. */
export class ResultOverlay {
  private readonly scene: Phaser.Scene;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly winner: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene, handlers: ResultHandlers) {
    this.scene = scene;
    this.dim = scene.add
      .rectangle(320, 180, 640, 360, 0x08060d, 1)
      .setAlpha(0)
      .setDepth(MATCH_DEPTH.RESULT);
    this.panel = scene.add
      .container(320, 180)
      .setDepth(MATCH_DEPTH.RESULT + 1)
      .setAlpha(0);

    const frame = scene.add.graphics();
    frame.fillStyle(0x000000, 0.62);
    frame.fillPoints(octagon(320, 160, 14, 2, 3), true);
    frame.fillStyle(0x14121c, 0.98);
    frame.fillPoints(octagon(320, 160, 14), true);
    frame.lineStyle(2.5, PALETTE_HEX.orange, 1);
    frame.strokePoints(octagon(320, 160, 14), true);
    frame.lineStyle(1, PALETTE_HEX.gold, 0.7);
    frame.strokePoints(octagon(310, 150, 12), true);
    drawDiamond(frame, -148, -68, 3, PALETTE_HEX.gold);
    drawDiamond(frame, 148, -68, 3, PALETTE_HEX.gold);

    this.title = tracked(
      scene,
      0,
      -44,
      'VICTORY',
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '32px',
        color: '#FFC247',
      },
      2,
    )
      .setOrigin(0.5)
      .setShadow(0, 3, '#000000', 5, false, true);
    this.winner = addUiText(scene, 0, -10, '', {
      fontFamily: BODY_FONT,
      fontSize: '13px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Frame first, controls last: a Container renders children in list order,
    // so adding the button containers before the filled frame hid them.
    this.panel.add([frame, this.title, this.winner]);
    new ArcadeButton(scene, {
      x: -78,
      y: 44,
      width: 132,
      height: 28,
      label: 'REMATCH',
      variant: 'primary',
      fontSize: 12,
      parent: this.panel,
      onSelect: handlers.onRematch,
    });
    new ArcadeButton(scene, {
      x: 78,
      y: 44,
      width: 132,
      height: 28,
      label: 'MAIN MENU',
      variant: 'dark',
      fontSize: 12,
      parent: this.panel,
      onSelect: handlers.onMainMenu,
    });

    this.setVisible(false);
  }

  show(result: Winner, winnerName: string): void {
    if (result === 'draw') {
      this.title.setText('DRAW');
      this.title.setColor('#FFFFFF');
      this.winner.setText('THE MATCH ENDS IN A DRAW');
    } else {
      const victory = result === 'player';
      this.title.setText(victory ? 'VICTORY' : 'DEFEAT');
      this.title.setColor(victory ? '#FFC247' : '#B36BFF');
      this.winner.setText(`${winnerName} WINS THE MATCH`);
    }
    this.setVisible(true);
  }

  private setVisible(value: boolean): void {
    this.visible = value;
    this.dim.setAlpha(value ? 0.78 : 0);
    this.panel.setAlpha(value ? 1 : 0);
    this.panel.setScale(value ? 1 : 0.94);
    // Buttons must not receive input while hidden.
    for (const child of this.panel.list) {
      if (child instanceof Phaser.GameObjects.Container) child.setVisible(value);
    }
    if (value) {
      this.scene.tweens.add({
        targets: this.panel,
        alpha: 1,
        scale: 1,
        duration: 220,
        ease: 'Sine.easeOut',
      });
    }
  }

  hide(): void {
    this.setVisible(false);
  }

  get isVisible(): boolean {
    return this.visible;
  }
}
