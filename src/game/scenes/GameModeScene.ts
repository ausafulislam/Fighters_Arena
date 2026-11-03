import Phaser from 'phaser';

import {
  DEFAULT_MODE_INDEX,
  GAME_MODES,
  MODE_CONFIG,
  MODE_DEPTH,
  MODE_LAYOUT,
} from '@/constants/gameModes';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { configureSceneCamera } from '@/utils/camera';
import { CourtyardStage } from '@/game/ui/CourtyardStage';
import { GameModeCard } from '@/game/ui/GameModeCard';
import { GameHud } from '@/game/ui/GameHud';
import { ModeHeader } from '@/game/ui/ModeHeader';
import { ModeInfoBar } from '@/game/ui/ModeInfoBar';
import type { GameModeSceneData, GameModeSnapshot } from '@/types/gameModes';

/**
 * Phase 4 Game Mode Selection screen, extended in Phase 5 with the forward
 * navigation step: choosing a mode now leads to Character Selection. The
 * Back button returns to Welcome. Cards are still purely visual - no game
 * mode, arena or combat system is started.
 *
 * Keyboard input deduplicates by the native event timeStamp: Phaser can
 * re-emit a queued DOM keydown more than once when the frame loop is slow.
 */
export class GameModeScene extends Phaser.Scene {
  private stage!: CourtyardStage;
  private hud!: GameHud;
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

    this.stage = new CourtyardStage(this, {
      layout: MODE_LAYOUT,
      depth: MODE_DEPTH,
      petalCount: MODE_CONFIG.PETAL_COUNT,
    });
    new ModeHeader(this);
    this.hud = new GameHud({
      scene: this,
      hud: MODE_LAYOUT.hud,
      depth: MODE_DEPTH.HUD,
      back: MODE_LAYOUT.back,
      onBack: () => this.goBack(),
    });
    this.infoBar = new ModeInfoBar(this);

    GAME_MODES.forEach((config, index) => {
      const card = new GameModeCard(this, config, index, {
        onSelect: (i) => this.confirmMode(i),
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
    this.hud.update(time);
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
      this.confirmMode(this.snapshot.selectedIndex);
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

  /** A card click / Enter picks the mode and moves to Character Selection. */
  private confirmMode(index: number): void {
    if (this.transitioning) return;
    this.cards[index]?.press();
    this.selectMode(index, true);
    this.goToCharacterSelect();
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

  private goToCharacterSelect(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.hud.setEnabled(false);
    for (const card of this.cards) card.setEnabled(false);
    const modeId = GAME_MODES[this.snapshot.selectedIndex]?.id ?? null;
    this.publish();

    this.cameras.main.fadeOut(280, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECT, {
        from: SCENE_KEYS.MODE_SELECT,
        modeId,
      });
    });
  }

  /** Back to the Welcome Screen with a short camera fade; music is untouched. */
  private goBack(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.backCount += 1;
    this.hud.setEnabled(false);
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
