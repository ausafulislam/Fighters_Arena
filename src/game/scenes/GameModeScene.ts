import Phaser from 'phaser';

import { DEFAULT_MODE_INDEX, GAME_MODES, MODE_CONFIG } from '@/constants/gameModes';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { configureSceneCamera } from '@/utils/camera';
import { GameModeCard } from '@/game/ui/GameModeCard';
import { ModeHeader } from '@/game/ui/ModeHeader';
import { ModeInfoBar } from '@/game/ui/ModeInfoBar';
import { ModeNav } from '@/game/ui/ModeNav';
import { ModeStage } from '@/game/ui/ModeStage';
import type { GameModeSceneData, GameModeSnapshot } from '@/types/gameModes';

/**
 * Phase 4 Game Mode Selection screen.
 *
 * Composition lives in ModeStage / ModeHeader / ModeNav / ModeInfoBar and four
 * GameModeCard instances. Selection is purely visual: no mode, character or
 * arena screen is started. Only the Back button navigates, back to Welcome.
 * The game-level AudioManager is untouched, so the theme never restarts.
 *
 * Keyboard input deduplicates by the native event timeStamp: Phaser can
 * re-emit a queued DOM keydown more than once when the frame loop is slow,
 * which would otherwise skip a card.
 */
export class GameModeScene extends Phaser.Scene {
  private stage!: ModeStage;
  private nav!: ModeNav;
  private infoBar!: ModeInfoBar;
  private cards: GameModeCard[] = [];
  private lastKeyStamp = -1;
  private snapshot!: GameModeSnapshot;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.MODE_SELECT);
  }

  init(data?: GameModeSceneData): void {
    this.cards = [];
    this.lastKeyStamp = -1;
    this.transitioning = false;
    this.snapshot = {
      sceneKey: SCENE_KEYS.MODE_SELECT,
      selectedIndex: DEFAULT_MODE_INDEX,
      hoveredIndex: null,
      pressCounts: { battle: 0, tournament: 0, versus: 0, survival: 0 },
      description: '',
      backCount: 0,
      transitionedFrom: data?.from ?? null,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.stage = new ModeStage(this);
    new ModeHeader(this);
    this.nav = new ModeNav(this, () => this.goBack());
    this.infoBar = new ModeInfoBar(this);

    GAME_MODES.forEach((config, index) => {
      const card = new GameModeCard(this, config, index, {
        onSelect: (i) => this.selectMode(i, true),
        onHover: (i) => {
          this.snapshot.hoveredIndex = i;
          this.publish();
        },
      });
      this.cards.push(card);
    });

    this.applySelection(DEFAULT_MODE_INDEX, true);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([
      K.LEFT,
      K.RIGHT,
      K.A,
      K.D,
      K.ENTER,
      K.SPACE,
      K.ESC,
      K.BACKSPACE,
    ]);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detachKeyboard, this);

    this.cameras.main.fadeIn(MODE_CONFIG.FADE_IN_MS, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.MODE_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:mode-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    this.stage.update(time, delta);
    this.nav.update(time);
    for (const card of this.cards) card.update(time);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.transitioning || event.repeat || event.timeStamp <= this.lastKeyStamp) return;
    this.lastKeyStamp = event.timeStamp;
    const code = event.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.selectMode(Math.max(0, this.snapshot.selectedIndex - 1), false);
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.selectMode(Math.min(GAME_MODES.length - 1, this.snapshot.selectedIndex + 1), false);
    } else if (code === 'Enter' || code === 'Space') {
      this.cards[this.snapshot.selectedIndex]?.press();
      this.selectMode(this.snapshot.selectedIndex, true);
    } else if (code === 'Escape' || code === 'Backspace') {
      this.goBack();
    }
  };

  private detachKeyboard(): void {
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
  }

  private selectMode(index: number, countPress: boolean): void {
    const config = GAME_MODES[index];
    if (!config) return;
    if (countPress) this.snapshot.pressCounts[config.id] += 1;
    this.applySelection(index, false);
  }

  private applySelection(index: number, immediate: boolean): void {
    const config = GAME_MODES[index];
    if (!config) return;
    this.snapshot.selectedIndex = index;
    this.snapshot.description = config.infoText;
    this.cards.forEach((card, i) => card.setSelected(i === index));
    this.infoBar.setDescription(config.infoText, immediate);
    this.publish();
  }

  /** Back to the Welcome Screen with a short camera fade; music is untouched. */
  private goBack(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.backCount += 1;
    this.nav.setEnabled(false);
    for (const card of this.cards) card.setEnabled(false);
    this.publish();

    this.cameras.main.fadeOut(MODE_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.WELCOME, { from: SCENE_KEYS.MODE_SELECT });
    });
  }

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.MODE_STATE, {
      ...this.snapshot,
      pressCounts: { ...this.snapshot.pressCounts },
    });
  }
}
