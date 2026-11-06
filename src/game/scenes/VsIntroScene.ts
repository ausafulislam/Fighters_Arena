import Phaser from 'phaser';

import { characterCardTextureKey, characterShowcaseTextureKey } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { MATCH_DEPTH } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { MatchSetup } from '@/game/match/MatchSetup';
import { playSfx } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import { configureSceneCamera } from '@/utils/camera';
import { DISPLAY_FONT, MENU_FONT } from '@/utils/fonts';
import { octagon } from '@/utils/shapes';
import { addUiText, tracked } from '@/utils/typography';
import type { VsIntroSnapshot } from '@/types/arenas';

/** Timings are in scene milliseconds; the sequence never needs a click. */
const SEQUENCE = {
  ENTRANCE: 220,
  VS: 780,
  READY: 1320,
  FIGHT: 1960,
  LEAVE: 2640,
} as const;

/**
 * Step 3: cinematic VS intro on the SELECTED arena. Fighters slide in from
 * the sides, the VS graphic lands, then READY and FIGHT! lead straight into
 * gameplay. Character / arena data always comes from MatchSetup.
 */
export class VsIntroScene extends Phaser.Scene {
  private snapshot!: VsIntroSnapshot;
  private banner!: Phaser.GameObjects.Text;
  private vs!: Phaser.GameObjects.Text;
  private playerArt!: Phaser.GameObjects.Image;
  private opponentArt!: Phaser.GameObjects.Image;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.VS_INTRO);
  }

  init(): void {
    const setup = MatchSetup.getInstance().getSnapshot();
    this.transitioning = false;
    this.snapshot = {
      sceneKey: SCENE_KEYS.VS_INTRO,
      playerId: setup.playerId,
      opponentId: setup.opponentId,
      arenaId: ArenaSelection.getInstance().selected.id as VsIntroSnapshot['arenaId'],
      stage: 'arena',
      completed: false,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor('#101014');
    const arena = ArenaSelection.getInstance().selected;
    const setup = MatchSetup.getInstance();

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, arena.backgroundTextureKey)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(MATCH_DEPTH.BACKGROUND);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0712, 1)
      .setAlpha(0.44)
      .setDepth(MATCH_DEPTH.SCRIM);

    // Selected fighters, not hardcoded names or artwork.
    this.playerArt = this.add
      .image(-120, 306, characterShowcaseTextureKey(setup.player.id))
      .setOrigin(0.5, 1)
      .setDisplaySize(176, 196)
      .setDepth(MATCH_DEPTH.FIGHTERS);
    this.opponentArt = this.add
      .image(760, 306, characterShowcaseTextureKey(setup.opponent.id))
      .setOrigin(0.5, 1)
      .setDisplaySize(176, 196)
      .setFlipX(true)
      .setDepth(MATCH_DEPTH.FIGHTERS);

    this.portrait(
      30,
      32,
      setup.player.cardTextureKey ?? characterCardTextureKey(setup.player.id),
      false,
    );
    this.portrait(
      610,
      32,
      setup.opponent.cardTextureKey ?? characterCardTextureKey(setup.opponent.id),
      true,
    );
    tracked(
      this,
      106,
      24,
      setup.player.name,
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '17px',
        color: '#FFFFFF',
      },
      1,
    )
      .setOrigin(0, 0.5)
      .setDepth(MATCH_DEPTH.HUD);
    tracked(
      this,
      534,
      24,
      setup.opponent.name,
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '17px',
        color: '#FFFFFF',
      },
      1,
    )
      .setOrigin(1, 0.5)
      .setDepth(MATCH_DEPTH.HUD);
    this.healthBar(104, 44, PALETTE_HEX.orange, false);
    this.healthBar(536, 44, PALETTE_HEX.purple, true);

    this.vs = tracked(
      this,
      320,
      150,
      'VS',
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '76px',
        color: '#FF5A00',
        stroke: '#2A0800',
        strokeThickness: 9,
      },
      3,
    )
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS)
      .setAlpha(0)
      .setScale(2.2);
    this.banner = addUiText(this, 320, 224, 'READY', {
      fontFamily: MENU_FONT,
      fontSize: '38px',
      color: '#FFC247',
      stroke: '#101014',
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS)
      .setAlpha(0);

    this.cameras.main.fadeIn(320, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.VS_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:vs-ready'));
    this.publish();

    this.time.delayedCall(SEQUENCE.ENTRANCE, () => {
      this.setStage('entrance');
      playSfx(SFX.ENTRANCE);
      this.tweens.add({ targets: this.playerArt, x: 156, duration: 520, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: this.opponentArt, x: 484, duration: 520, ease: 'Cubic.easeOut' });
    });
    this.time.delayedCall(SEQUENCE.VS, () => {
      this.setStage('vs');
      this.vs.setAlpha(1);
      this.tweens.add({ targets: this.vs, scale: 1, duration: 300, ease: 'Back.easeOut' });
    });
    this.time.delayedCall(SEQUENCE.READY, () => {
      this.setStage('ready');
      playSfx(SFX.READY);
      this.showBanner('READY', '#FFC247');
    });
    this.time.delayedCall(SEQUENCE.FIGHT, () => {
      this.setStage('fight');
      playSfx(SFX.FIGHT);
      this.showBanner('FIGHT!', '#FF5A00');
    });
    this.time.delayedCall(SEQUENCE.LEAVE, () => {
      this.setStage('complete');
      this.snapshot.completed = true;
      this.publish();
      this.leave();
    });
  }

  private portrait(x: number, y: number, textureKey: string, mirrored: boolean): void {
    const image = this.add.image(x, y, textureKey).setDisplaySize(40, 40).setDepth(MATCH_DEPTH.HUD);
    image.setCrop(4, 4, 120, 120);
    const g = this.add.graphics().setDepth(MATCH_DEPTH.HUD + 1);
    g.lineStyle(2.5, mirrored ? PALETTE_HEX.purple : PALETTE_HEX.orange, 1);
    g.strokePoints(octagon(46, 46, 8, x, y), true);
  }

  private healthBar(x: number, y: number, color: number, _mirrored: boolean): void {
    const g = this.add.graphics().setDepth(MATCH_DEPTH.HUD);
    g.fillStyle(0x000000, 0.7);
    g.fillRect(x - 91, y - 8, 182, 16);
    g.fillStyle(color, 1);
    g.fillRect(x - 87, y - 5, 174, 10);
    g.lineStyle(1.5, PALETTE_HEX.gold, 1);
    g.strokeRect(x - 91, y - 8, 182, 16);
  }

  private showBanner(text: string, color: string): void {
    this.banner.setText(text).setColor(color).setAlpha(0).setScale(1.4);
    this.tweens.add({
      targets: this.banner,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Sine.easeOut',
    });
  }

  private setStage(stage: string): void {
    this.snapshot.stage = stage;
    this.publish();
  }

  private leave(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(260, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.GAMEPLAY, { from: SCENE_KEYS.VS_INTRO });
    });
  }

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.VS_STATE, { ...this.snapshot });
  }
}
