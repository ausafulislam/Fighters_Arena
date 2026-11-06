import type Phaser from 'phaser';

import { characterCardTextureKey } from '@/constants/assets';
import { MATCH_CONFIG, MATCH_DEPTH, MATCH_HUD_LAYOUT } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_FONT, MENU_FONT } from '@/utils/fonts';
import { octagon } from '@/utils/shapes';
import { addUiText, tracked } from '@/utils/typography';
import { IconButton } from '@/game/ui/IconButton';
import type { CharacterConfig } from '@/types/characters';
import type { MatchManager } from '@/game/match/MatchManager';
import type { Fighter } from '@/game/characters/Fighter';

const L = MATCH_HUD_LAYOUT;

/** Real gameplay HUD: portraits, names, health, energy, rounds, timer, pause. */
export class MatchHud {
  private readonly scene: Phaser.Scene;
  private readonly health: Phaser.GameObjects.Graphics;
  private readonly energy: Phaser.GameObjects.Graphics;
  private readonly rounds: Phaser.GameObjects.Graphics;
  private readonly damageFlash: Phaser.GameObjects.Graphics;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  readonly pauseButton: IconButton;

  constructor(
    scene: Phaser.Scene,
    playerConfig: CharacterConfig,
    opponentConfig: CharacterConfig,
    onPause: () => void,
  ) {
    this.scene = scene;
    const depth = MATCH_DEPTH.HUD;

    this.portrait(L.playerPortrait.x, L.playerPortrait.y, playerConfig.portraitTextureKey, depth);
    this.portrait(
      L.opponentPortrait.x,
      L.opponentPortrait.y,
      opponentConfig.portraitTextureKey,
      depth,
    );

    tracked(
      scene,
      L.playerName.x,
      L.playerName.y,
      playerConfig.name,
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '13px',
        color: '#FFFFFF',
      },
      0.8,
    )
      .setOrigin(0, 0.5)
      .setDepth(depth + 1);
    tracked(
      scene,
      L.opponentName.x,
      L.opponentName.y,
      opponentConfig.name,
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '13px',
        color: '#FFFFFF',
      },
      0.8,
    )
      .setOrigin(1, 0.5)
      .setDepth(depth + 1);

    this.health = scene.add.graphics().setDepth(depth);
    this.energy = scene.add.graphics().setDepth(depth);
    this.rounds = scene.add.graphics().setDepth(depth);
    this.damageFlash = scene.add
      .graphics()
      .setDepth(depth + 1)
      .setAlpha(0);

    const timerFrame = scene.add.graphics().setDepth(depth);
    timerFrame.fillStyle(0x000000, 0.6);
    timerFrame.fillPoints(
      octagon(L.timer.width, L.timer.height, 9, L.timer.x + 2, L.timer.y + 3),
      true,
    );
    timerFrame.fillStyle(0x14121c, 0.97);
    timerFrame.fillPoints(octagon(L.timer.width, L.timer.height, 9, L.timer.x, L.timer.y), true);
    timerFrame.lineStyle(2, PALETTE_HEX.gold, 1);
    timerFrame.strokePoints(octagon(L.timer.width, L.timer.height, 9, L.timer.x, L.timer.y), true);
    this.timerText = addUiText(scene, L.timer.x, L.timer.y, '99', {
      fontFamily: DISPLAY_FONT,
      fontSize: '24px',
      color: '#FFC247',
    })
      .setOrigin(0.5)
      .setDepth(depth + 1);

    this.comboText = addUiText(scene, 320, 74, '', {
      fontFamily: MENU_FONT,
      fontSize: '12px',
      color: '#FF5A00',
    })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setAlpha(0);

    this.pauseButton = new IconButton(scene, {
      x: L.pause.x,
      y: L.pause.y,
      width: L.pause.width,
      height: L.pause.height,
      icon: 'pause',
      iconSize: 13,
      depth: depth + 2,
      onSelect: onPause,
    });
  }

  private portrait(x: number, y: number, textureKey: string, depth: number): void {
    const size = 40;
    this.scene.add
      .image(x, y, textureKey || characterCardTextureKey('kenji'))
      .setDisplaySize(size, size)
      .setDepth(depth + 1);
    const frame = this.scene.add.graphics().setDepth(depth + 2);
    frame.lineStyle(2.5, PALETTE_HEX.gold, 1);
    frame.strokePoints(octagon(size + 6, size + 6, 8, x, y), true);
    frame.lineStyle(1.5, PALETTE_HEX.orange, 0.9);
    frame.strokePoints(octagon(size + 1, size + 1, 7, x, y), true);
  }

  /** Brief, controlled white pulse over the bar that actually took damage. */
  pulseDamage(side: 'player' | 'opponent'): void {
    const layout = side === 'player' ? L.playerBar : L.opponentBar;
    this.damageFlash.clear();
    this.damageFlash.fillStyle(0xffffff, 0.75);
    this.damageFlash.fillRect(
      layout.x - layout.width / 2,
      layout.y - layout.height / 2 - 2,
      layout.width + 4,
      layout.height + 4,
    );
    this.damageFlash.setAlpha(0.85);
    this.scene.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  setPauseEnabled(value: boolean): void {
    this.pauseButton.setEnabled(value);
  }

  pressPause(): void {
    this.pauseButton.press();
  }

  update(match: MatchManager, player: Fighter, opponent: Fighter): void {
    this.health.clear();
    this.energy.clear();
    this.bar(
      this.health,
      L.playerBar,
      player.health / MATCH_CONFIG.MAX_HEALTH,
      PALETTE_HEX.orange,
      false,
    );
    this.bar(
      this.health,
      L.opponentBar,
      opponent.health / MATCH_CONFIG.MAX_HEALTH,
      PALETTE_HEX.purple,
      true,
    );
    this.energyBar(L.playerEnergy, player.energy / MATCH_CONFIG.SPECIAL_MAX, false);
    this.energyBar(L.opponentEnergy, opponent.energy / MATCH_CONFIG.SPECIAL_MAX, true);
    this.drawRounds(match.playerRounds, match.opponentRounds);
    this.timerText.setText(String(Math.ceil(match.timeLeft)).padStart(2, '0'));

    const combo = Math.max(player.combo, opponent.combo);
    this.comboText.setText(combo > 1 ? `${combo} HIT COMBO` : '');
    this.comboText.setAlpha(combo > 1 ? 1 : 0);
    this.pauseButton.update(this.scene.time.now);
  }

  private bar(
    g: Phaser.GameObjects.Graphics,
    layout: { x: number; y: number; width: number; height: number },
    ratio: number,
    color: number,
    mirrored: boolean,
  ): void {
    const { x, y, width, height } = layout;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(x - width / 2 - 2, y - height / 2 - 2, width + 4, height + 4);
    g.fillStyle(0x2a2534, 1);
    g.fillRect(x - width / 2, y - height / 2, width, height);
    const fill = Math.max(0, Math.min(1, ratio)) * (width - 4);
    if (fill > 0) {
      g.fillStyle(color, 1);
      if (mirrored) g.fillRect(x + width / 2 - 2 - fill, y - height / 2 + 2, fill, height - 4);
      else g.fillRect(x - width / 2 + 2, y - height / 2 + 2, fill, height - 4);
      g.fillStyle(0xffffff, 0.22);
      if (mirrored) g.fillRect(x + width / 2 - 2 - fill, y - height / 2 + 2, fill, 2);
      else g.fillRect(x - width / 2 + 2, y - height / 2 + 2, fill, 2);
    }
    g.lineStyle(1.5, PALETTE_HEX.gold, 0.95);
    g.strokeRect(x - width / 2 - 2, y - height / 2 - 2, width + 4, height + 4);
  }

  private energyBar(
    layout: { x: number; y: number; width: number; height: number },
    ratio: number,
    mirrored: boolean,
  ): void {
    const { x, y, width, height } = layout;
    this.energy.fillStyle(0x000000, 0.6);
    this.energy.fillRect(x - width / 2 - 1, y - 1, width + 2, height + 2);
    const fill = Math.max(0, Math.min(1, ratio)) * width;
    this.energy.fillStyle(PALETTE_HEX.gold, 1);
    if (mirrored) this.energy.fillRect(x + width / 2 - fill, y, fill, height);
    else this.energy.fillRect(x - width / 2, y, fill, height);
  }

  private drawRounds(playerRounds: number, opponentRounds: number): void {
    this.rounds.clear();
    for (let i = 0; i < MATCH_CONFIG.ROUNDS_TO_WIN; i += 1) {
      for (const [x, count, color] of [
        [L.playerRounds.x, playerRounds, PALETTE_HEX.orange],
        [L.opponentRounds.x, opponentRounds, PALETTE_HEX.purple],
      ] as const) {
        const cx = x + (x < 320 ? i * 13 : -i * 13);
        this.rounds.lineStyle(1.5, PALETTE_HEX.gold, 0.9);
        this.rounds.strokeCircle(cx, L.playerRounds.y, 4);
        if (i < count) {
          this.rounds.fillStyle(color, 1);
          this.rounds.fillCircle(cx, L.playerRounds.y, 3);
        }
      }
    }
  }
}
