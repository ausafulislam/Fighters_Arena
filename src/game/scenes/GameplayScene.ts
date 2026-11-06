import Phaser from 'phaser';

import { TEXTURE_KEYS } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { MATCH_CONFIG, MATCH_DEPTH } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { MatchSetup } from '@/game/match/MatchSetup';
import { OpponentAI } from '@/game/ai/OpponentAI';
import { Fighter } from '@/game/characters/Fighter';
import { CombatSystem } from '@/game/combat/CombatSystem';
import { InputManager } from '@/game/input/InputManager';
import { MatchManager } from '@/game/match/MatchManager';
import { PauseManager } from '@/game/match/PauseManager';
import { playSfx } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import { MatchHud } from '@/game/ui/MatchHud';
import { MobileControls } from '@/game/ui/MobileControls';
import { PausePopup } from '@/game/ui/PausePopup';
import { ResultOverlay } from '@/game/ui/ResultOverlay';
import { loadMobileSettings } from '@/game/settings/mobileSettings';
import { configureSceneCamera } from '@/utils/camera';
import { MENU_FONT } from '@/utils/fonts';
import { createSoftGlowTexture, RUNTIME_TEXTURES } from '@/utils/textures';
import { addUiText } from '@/utils/typography';
import type { CombatHit } from '@/game/combat/CombatSystem';
import type { MatchEvent, Winner } from '@/game/match/MatchManager';
import type { MatchPhase, MatchSnapshot } from '@/types/match';
import type { OrientationSnapshot } from '@/types/system';
import type { MobileSettings } from '@/types/welcome';

interface AmbientParticle {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  sway: number;
  phase: number;
}

/**
 * Step 4-10: the actual playable 2D fighting match. Real gravity, ground
 * detection, facing, collision separation, startup/active/recovery attacks
 * with hitboxes, blocking, knockback, energy, combos, a state-based CPU,
 * best-of-three rounds, timer, pause, keyboard/touch controls and a live HUD.
 * Arena and fighters always come from the flow state, never hardcoded.
 */
export class GameplayScene extends Phaser.Scene {
  private player!: Fighter;
  private opponent!: Fighter;
  private readonly controls = new InputManager();
  private readonly ai = new OpponentAI();
  private readonly match = new MatchManager();
  private readonly pause = new PauseManager();
  private combat!: CombatSystem;
  private hud!: MatchHud;
  private mobile!: MobileControls;
  private result!: ResultOverlay;
  private pausePopup: PausePopup | null = null;
  private banner!: Phaser.GameObjects.Text;
  private readonly ambient: AmbientParticle[] = [];
  private settings!: MobileSettings;
  private snapshot!: MatchSnapshot;
  private lastJumpCount = 0;
  private lastSpecialCount = 0;
  private bannerTimer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;

  constructor() {
    super(SCENE_KEYS.GAMEPLAY);
  }

  init(): void {
    this.leaving = false;
    this.lastJumpCount = 0;
    this.lastSpecialCount = 0;
    this.bannerTimer = null;
    const setup = MatchSetup.getInstance().getSnapshot();
    this.snapshot = {
      sceneKey: SCENE_KEYS.GAMEPLAY,
      phase: 'intro',
      phaseBeforePause: null,
      paused: false,
      orientationPaused: false,
      round: 1,
      playerRounds: 0,
      opponentRounds: 0,
      timeLeft: MATCH_CONFIG.ROUND_TIME,
      player: this.emptyFighter(setup.playerId),
      opponent: this.emptyFighter(setup.opponentId),
      winner: null,
      matchWinner: null,
      playerId: setup.playerId,
      opponentId: setup.opponentId,
      arenaId: setup.arenaId,
      modeId: setup.modeId,
      hitCount: 0,
      blockedCount: 0,
      specialCount: 0,
      jumpCount: 0,
      aiState: 'idle',
      pauseCount: 0,
      resumeCount: 0,
      restartCount: 0,
      quitCount: 0,
      rematchCount: 0,
      mobileControlsVisible: false,
      leftHanded: false,
      touchControlSize: 'medium',
    };
  }

  private emptyFighter(id: string): MatchSnapshot['player'] {
    return {
      id,
      name: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      health: MATCH_CONFIG.MAX_HEALTH,
      energy: 0,
      state: 'idle',
      attack: null,
      facing: 1,
      grounded: true,
      blocking: false,
      combo: 0,
      frameIndex: 0,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor('#101014');
    createSoftGlowTexture(this);

    const setup = MatchSetup.getInstance();
    const arena = ArenaSelection.getInstance().selected;
    this.settings = loadMobileSettings();

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, arena.backgroundTextureKey)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(MATCH_DEPTH.BACKGROUND);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0712, 1)
      .setAlpha(0.26)
      .setDepth(MATCH_DEPTH.SCRIM);
    const floor = this.add.graphics().setDepth(MATCH_DEPTH.FLOOR_GLOW);
    floor.fillStyle(arena.accent, 0.14);
    floor.fillRect(0, MATCH_CONFIG.GROUND_Y - 2, GAME_WIDTH, 3);
    floor.lineStyle(1, PALETTE_HEX.gold, 0.35);
    floor.lineBetween(0, MATCH_CONFIG.GROUND_Y, GAME_WIDTH, MATCH_CONFIG.GROUND_Y);

    for (let i = 0; i < 14; i += 1) {
      const image = this.add
        .image(0, 0, TEXTURE_KEYS.PETAL)
        .setTint(arena.ambient)
        .setAlpha(0.35 + (i % 4) * 0.12)
        .setDepth(MATCH_DEPTH.AMBIENT);
      this.ambient.push({
        image,
        x: (i * 47) % GAME_WIDTH,
        y: (i * 31) % 240,
        speed: 8 + (i % 5) * 3,
        sway: 3 + (i % 3) * 3,
        phase: i * 0.7,
      });
    }

    this.player = new Fighter(this, setup.player, 'player', MATCH_CONFIG.PLAYER_START_X, 1);
    this.opponent = new Fighter(
      this,
      setup.opponent,
      'opponent',
      MATCH_CONFIG.OPPONENT_START_X,
      -1,
    );
    this.combat = new CombatSystem((hit) => this.onHit(hit));
    this.banner = addUiText(this, 320, 150, 'READY', {
      fontFamily: MENU_FONT,
      fontSize: '36px',
      color: '#FFC247',
      stroke: '#101014',
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS)
      .setAlpha(0);

    this.hud = new MatchHud(this, setup.player, setup.opponent, () => this.togglePause());
    this.controls.attach(this);
    this.mobile = new MobileControls(this, this.controls, this.settings);
    this.result = new ResultOverlay(this, {
      onRematch: () => this.rematch(),
      onMainMenu: () => this.quitToMenu(),
    });

    this.snapshot.mobileControlsVisible = this.mobile.isVisible;
    this.snapshot.leftHanded = this.settings.leftHanded;
    this.snapshot.touchControlSize = this.settings.touchControlSize;

    this.game.events.on(GAME_EVENTS.ORIENTATION_CHANGED, this.onOrientationChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detach, this);

    this.match.startMatch();
    this.ai.reset();
    this.showBanner('READY', '#FFC247');
    playSfx(SFX.ROUND_BELL);
    this.cameras.main.fadeIn(300, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.GAMEPLAY_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:gameplay-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    const dtMs = Math.min(delta, MATCH_CONFIG.MAX_DELTA_MS);
    if (this.controls.consumePause()) this.togglePause();
    const frame = this.controls.read();
    this.mobile.update(time);

    const active =
      !this.pause.paused &&
      this.match.phase !== 'matchEnd' &&
      this.match.phase !== 'roundEnd' &&
      !this.leaving;

    if (active) {
      const aiFrame = this.ai.update(dtMs, this.opponent, this.player);
      this.player.update(dtMs, frame, this.opponent);
      this.opponent.update(dtMs, aiFrame, this.player);
      this.player.separateFrom(this.opponent);
      this.combat.update(this.player, this.opponent);
      this.trackPlayerCounters();
      for (const event of this.match.update(dtMs, this.player, this.opponent)) {
        this.handleMatchEvent(event);
      }
    } else if (!this.pause.paused && this.match.phase === 'roundEnd') {
      // Rules still advance during the round-end hold, but combat is frozen.
      for (const event of this.match.update(dtMs, this.player, this.opponent)) {
        this.handleMatchEvent(event);
      }
    }

    this.updateAmbient(time, dtMs);
    this.hud.update(this.match, this.player, this.opponent);
    this.publish();
  }

  private trackPlayerCounters(): void {
    if (this.player.jumpCount > this.lastJumpCount) {
      this.match.registerJump();
      this.lastJumpCount = this.player.jumpCount;
    }
    if (this.player.specialCount > this.lastSpecialCount) {
      this.match.registerSpecial();
      this.lastSpecialCount = this.player.specialCount;
    }
  }

  private onHit(hit: CombatHit): void {
    this.match.registerHit(hit.blocked);
    const spark = this.add
      .image(hit.x, hit.y, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(hit.blocked ? PALETTE_HEX.gold : PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(hit.blocked ? 26 : 38, hit.blocked ? 26 : 38)
      .setDepth(MATCH_DEPTH.EFFECTS);
    this.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 1.7,
      duration: 220,
      onComplete: () => spark.destroy(),
    });
  }

  private handleMatchEvent(event: MatchEvent): void {
    switch (event) {
      case 'fight':
        this.hideBanner();
        this.showBanner('FIGHT!', '#FF5A00', 700);
        playSfx(SFX.FIGHT);
        break;
      case 'roundStart':
        this.resetRound();
        break;
      case 'timeUp':
        this.showBanner('TIME UP', '#FFFFFF');
        break;
      case 'roundEnd':
        this.onRoundEnd();
        break;
      case 'matchEnd':
        this.onMatchEnd();
        break;
      default:
        break;
    }
  }

  private resetRound(): void {
    this.player.reset(MATCH_CONFIG.PLAYER_START_X, 1);
    this.opponent.reset(MATCH_CONFIG.OPPONENT_START_X, -1);
    this.ai.reset();
    this.result.hide();
    this.hud.setPauseEnabled(true);
    this.showBanner('READY', '#FFC247');
    playSfx(SFX.ROUND_BELL);
  }

  private onRoundEnd(): void {
    const winner = this.match.winner;
    this.showBanner(winner === 'draw' ? 'DRAW' : 'K.O.', winner === 'draw' ? '#FFFFFF' : '#FFC247');
    this.player.celebrate(winner === 'player');
    this.opponent.celebrate(winner === 'opponent');
    if (winner === 'player') playSfx(SFX.VICTORY);
    else if (winner === 'opponent') playSfx(SFX.DEFEAT);
  }

  private onMatchEnd(): void {
    const winner: Winner = this.match.matchWinner;
    const name = winner === 'player' ? this.player.config.name : this.opponent.config.name;
    this.result.show(winner, name);
    this.hud.setPauseEnabled(false);
    playSfx(winner === 'player' ? SFX.VICTORY : SFX.DEFEAT);
  }

  private showBanner(text: string, color: string, holdMs = 0): void {
    this.bannerTimer?.remove();
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(1.25);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 180, ease: 'Sine.easeOut' });
    if (holdMs > 0) {
      this.bannerTimer = this.time.delayedCall(holdMs, () => this.hideBanner());
    }
  }

  private hideBanner(): void {
    this.bannerTimer?.remove();
    this.bannerTimer = null;
    this.tweens.add({ targets: this.banner, alpha: 0, duration: 220 });
  }

  private updateAmbient(timeMs: number, dtMs: number): void {
    const seconds = timeMs / 1000;
    for (const particle of this.ambient) {
      particle.y += particle.speed * (dtMs / 1000);
      if (particle.y > GAME_HEIGHT) particle.y = -4;
      particle.image.setPosition(
        Math.round(particle.x + Math.sin(seconds * 0.7 + particle.phase) * particle.sway),
        Math.round(particle.y),
      );
    }
  }

  // --- Pause / orientation ------------------------------------------------

  private togglePause(): void {
    if (this.match.phase === 'matchEnd' || this.leaving) return;
    this.pause.toggle();
    this.syncPauseUi();
    this.publish();
  }

  private syncPauseUi(): void {
    const needsPopup =
      this.pause.pausedByUser && !this.pause.pausedByOrientation && !this.result.isVisible;
    if (needsPopup && !this.pausePopup) {
      this.pausePopup = PausePopup.create(this, {
        onResume: () => this.resumeGame(),
        onRestart: () => this.restartMatch(),
        onQuit: () => this.quitToMenu(),
      });
    } else if (!needsPopup && this.pausePopup) {
      const popup = this.pausePopup;
      this.pausePopup = null;
      popup.dismissExternally();
    }
    this.hud.setPauseEnabled(!this.pause.paused && this.match.phase !== 'matchEnd');
  }

  private resumeGame(): void {
    if (this.pause.pausedByUser) this.pause.resume();
    this.syncPauseUi();
    this.publish();
  }

  private restartMatch(): void {
    this.snapshot.restartCount += 1;
    this.pause.reset();
    this.syncPauseUi();
    this.match.restart();
    this.lastJumpCount = 0;
    this.lastSpecialCount = 0;
    this.resetRound();
    this.publish();
  }

  private rematch(): void {
    this.snapshot.rematchCount += 1;
    this.restartMatch();
  }

  private quitToMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.snapshot.quitCount += 1;
    this.pause.reset();
    this.syncPauseUi();
    this.publish();
    this.cameras.main.fadeOut(260, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.WELCOME, { from: SCENE_KEYS.GAMEPLAY });
    });
  }

  private readonly onOrientationChanged = (snapshot: OrientationSnapshot): void => {
    this.pause.setPortrait(snapshot.orientation === 'portrait');
    // A user pause is never auto-resumed; an orientation pause is.
    this.syncPauseUi();
    this.publish();
  };

  private readonly detach = (): void => {
    this.game.events.off(GAME_EVENTS.ORIENTATION_CHANGED, this.onOrientationChanged, this);
    this.bannerTimer?.remove();
    this.controls.destroy();
    this.player.destroy();
    this.opponent.destroy();
  };

  private publish(): void {
    const phase: MatchPhase = this.pause.paused ? 'paused' : this.match.phase;
    this.snapshot.phase = phase;
    this.snapshot.phaseBeforePause = this.pause.paused ? this.match.phase : null;
    this.snapshot.paused = this.pause.paused;
    this.snapshot.orientationPaused = this.pause.pausedByOrientation;
    this.snapshot.round = this.match.round;
    this.snapshot.playerRounds = this.match.playerRounds;
    this.snapshot.opponentRounds = this.match.opponentRounds;
    this.snapshot.timeLeft = Math.round(this.match.timeLeft * 10) / 10;
    this.snapshot.player = this.player.getSnapshot();
    this.snapshot.opponent = this.opponent.getSnapshot();
    this.snapshot.winner = this.match.winner;
    this.snapshot.matchWinner = this.match.matchWinner;
    this.snapshot.hitCount = this.match.hitCount;
    this.snapshot.blockedCount = this.match.blockedCount;
    this.snapshot.specialCount = this.match.specialCount;
    this.snapshot.jumpCount = this.match.jumpCount;
    this.snapshot.aiState = this.ai.currentState;
    this.snapshot.pauseCount = this.pause.pauseCount;
    this.snapshot.resumeCount = this.pause.resumeCount;
    this.snapshot.mobileControlsVisible = this.mobile.isVisible;
    this.game.registry.set(REGISTRY_KEYS.MATCH_STATE, {
      ...this.snapshot,
      player: { ...this.snapshot.player },
      opponent: { ...this.snapshot.opponent },
    });
  }
}
