import Phaser from 'phaser';

import {
  CHARACTERS,
  CHARACTER_CONFIG,
  CHARACTER_DEPTH,
  CHARACTER_HEADER_TITLE,
  CHARACTER_INFO_DEFAULT,
  CHARACTER_LAYOUT,
  CHARACTER_STAGE_LAYOUT,
} from '@/constants/characters';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { CharacterSelection } from '@/game/characters/CharacterSelection';
import type { SelectionChange } from '@/game/characters/CharacterSelection';
import { CharacterCard } from '@/game/ui/CharacterCard';
import { CharacterHeader } from '@/game/ui/CharacterHeader';
import { CharacterInfoBar } from '@/game/ui/CharacterInfoBar';
import { CharacterShowcase } from '@/game/ui/CharacterShowcase';
import { CourtyardStage } from '@/game/ui/CourtyardStage';
import { GameHud } from '@/game/ui/GameHud';
import { RandomOption } from '@/game/ui/RandomOption';
import type { CharacterSceneData, CharacterSnapshot } from '@/types/characters';
import { configureSceneCamera } from '@/utils/camera';

/**
 * Phase 5 Character Selection. Real interactive roster, not a static image.
 * All state lives in the game-level CharacterSelection manager; this scene only
 * composes views and forwards input. No arena selection or gameplay exists.
 */
export class CharacterScene extends Phaser.Scene {
  private stage!: CourtyardStage;
  private hud!: GameHud;
  private infoBar!: CharacterInfoBar;
  private showcase!: CharacterShowcase;
  private randomOption!: RandomOption;
  private cards: CharacterCard[] = [];
  private unsubscribe: (() => void) | null = null;
  private lastKeyStamp = -1;
  private snapshot!: CharacterSnapshot;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.CHARACTER_SELECT);
  }

  init(data?: CharacterSceneData): void {
    this.cards = [];
    this.lastKeyStamp = -1;
    this.transitioning = false;
    this.snapshot = {
      sceneKey: SCENE_KEYS.CHARACTER_SELECT,
      selectedId: 'kenji',
      selectedIndex: 0,
      selectionCount: 0,
      randomCount: 0,
      lastSource: null,
      selectedName: '',
      style: '',
      stats: { power: 0, speed: 0, defense: 0, range: 0 },
      infoText: CHARACTER_INFO_DEFAULT,
      cardCount: 0,
      hoveredIndex: null,
      artwork: { x: 0, y: 0, width: 0, height: 0 },
      backCount: 0,
      transitionedFrom: data?.from ?? null,
      modeId: data?.modeId ?? null,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    const manager = CharacterSelection.getInstance();
    const initial = manager.selected;

    this.stage = new CourtyardStage(this, {
      layout: CHARACTER_STAGE_LAYOUT,
      depth: CHARACTER_DEPTH,
      petalCount: CHARACTER_CONFIG.PETAL_COUNT,
      scrimAlpha: 0.34,
      seed: 0x51c0de,
    });
    new CharacterHeader(this);
    this.hud = new GameHud({
      scene: this,
      hud: CHARACTER_LAYOUT.hud,
      depth: CHARACTER_DEPTH.HUD,
      back: CHARACTER_LAYOUT.back,
      onBack: () => this.goBack(),
    });
    this.infoBar = new CharacterInfoBar(this);
    this.showcase = new CharacterShowcase(this, initial);
    this.randomOption = new RandomOption(this, () => manager.selectRandom());

    const C = CHARACTER_LAYOUT.cards;
    const positions: { x: number; y: number }[] = [
      ...C.topX.map((x) => ({ x, y: C.topY })),
      ...C.bottomX.map((x) => ({ x, y: C.bottomY })),
    ];
    CHARACTERS.forEach((config, index) => {
      const position = positions[index];
      if (!position) return;
      this.cards.push(
        new CharacterCard(this, config, index, position.x, position.y, {
          onSelect: (i) => this.selectCard(i),
          onHover: (i) => {
            this.snapshot.hoveredIndex = i;
            this.publish();
          },
        }),
      );
    });

    this.infoBar.setDescription(CHARACTER_INFO_DEFAULT, true);
    this.applySelection(initial, true, false);
    this.unsubscribe = manager.subscribe((change) => this.onManagerChange(change));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detach, this);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([
      K.LEFT,
      K.RIGHT,
      K.UP,
      K.DOWN,
      K.A,
      K.D,
      K.W,
      K.S,
      K.ENTER,
      K.SPACE,
      K.ESC,
      K.BACKSPACE,
    ]);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);

    this.cameras.main.fadeIn(CHARACTER_CONFIG.FADE_IN_MS, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.CHARACTER_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:character-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    this.stage.update(time, delta);
    this.hud.update(time);
    for (const card of this.cards) card.update(time);
    this.randomOption.update(time);
    this.showcase.update(time, delta);
  }

  private selectCard(index: number): void {
    const config = CHARACTERS[index];
    if (!config || !config.unlocked || this.transitioning) return;
    CharacterSelection.getInstance().select(config.id, 'card');
  }

  private readonly onManagerChange = (change: SelectionChange): void => {
    this.applySelection(change.config, false, true);
  };

  private applySelection(
    config: (typeof CHARACTERS)[number],
    immediate: boolean,
    updateInfo: boolean,
  ): void {
    const manager = CharacterSelection.getInstance();
    this.cards.forEach((card, i) => card.setSelected(CHARACTERS[i]?.id === config.id));
    this.showcase.setCharacter(config, immediate);
    if (updateInfo) this.infoBar.setDescription(config.infoText);

    this.snapshot.selectedId = config.id;
    this.snapshot.selectedIndex = manager.selectedIndex;
    this.snapshot.selectedName = config.name;
    this.snapshot.style = config.style;
    this.snapshot.stats = { ...config.stats };
    this.snapshot.selectionCount = manager.getSnapshot().selectionCount;
    this.snapshot.randomCount = manager.getSnapshot().randomCount;
    this.snapshot.lastSource = manager.getSnapshot().lastSource;
    this.snapshot.infoText = updateInfo ? config.infoText : CHARACTER_INFO_DEFAULT;
    this.snapshot.cardCount = this.cards.length;
    this.snapshot.artwork = this.showcase.artworkBounds;
    this.publish();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.transitioning || event.repeat || event.timeStamp <= this.lastKeyStamp) return;
    this.lastKeyStamp = event.timeStamp;
    const manager = CharacterSelection.getInstance();
    const current = manager.selectedIndex;
    const code = event.code;

    if (code === 'Escape' || code === 'Backspace') {
      this.goBack();
      return;
    }
    if (code === 'ArrowLeft' || code === 'KeyA') {
      manager.selectIndex((current - 1 + CHARACTERS.length) % CHARACTERS.length, 'keyboard');
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      manager.selectIndex((current + 1) % CHARACTERS.length, 'keyboard');
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      manager.selectIndex(current >= 4 ? current - 4 : current, 'keyboard');
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      manager.selectIndex(current <= 2 ? current + 4 : current, 'keyboard');
    } else if (code === 'Enter' || code === 'Space') {
      this.cards[current]?.press();
      manager.selectIndex(current, 'card');
    }
  };

  private detachKeyboard(): void {
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
  }

  private readonly detach = (): void => {
    this.detachKeyboard();
    this.unsubscribe?.();
    this.unsubscribe = null;
  };

  /** Back to Game Mode Selection with a short camera fade; music is untouched. */
  private goBack(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.backCount += 1;
    this.hud.setEnabled(false);
    for (const card of this.cards) card.setEnabled(false);
    this.randomOption.setEnabled(false);
    this.publish();

    this.cameras.main.fadeOut(CHARACTER_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.MODE_SELECT, { from: SCENE_KEYS.CHARACTER_SELECT });
    });
  }

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.CHARACTER_SCENE_STATE, {
      ...this.snapshot,
      stats: { ...this.snapshot.stats },
      artwork: { ...this.snapshot.artwork },
      headerTitle: CHARACTER_HEADER_TITLE,
      infoDefault: CHARACTER_INFO_DEFAULT,
    });
  }
}
