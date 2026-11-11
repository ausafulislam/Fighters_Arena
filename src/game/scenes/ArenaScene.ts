import Phaser from 'phaser';

import { ARENA_CONFIG, ARENA_DEPTH, ARENA_LAYOUT, ARENAS } from '@/constants/arenas';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { CHARACTER_STAGE_LAYOUT } from '@/constants/characters';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { playSfx } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import { ArenaCard } from '@/game/ui/ArenaCard';
import { CourtyardStage } from '@/game/ui/CourtyardStage';
import { GameHud } from '@/game/ui/GameHud';
import { IconButton } from '@/game/ui/IconButton';
import { InfoBar } from '@/game/ui/InfoBar';
import { ScreenHeader } from '@/game/ui/ScreenHeader';
import { ArcadeButton } from '@/game/ui/ArcadeButton';
import { configureSceneCamera } from '@/utils/camera';
import type { ArenaSceneSnapshot } from '@/types/arenas';

/**
 * Step 1 of Phase 6: five real arena cards, mouse/touch selection, working
 * arrows and a CONFIRM that opens the Arena Preview. Back returns to Character
 * Selection. The selected arena is stored in the game-level ArenaSelection.
 */
export class ArenaScene extends Phaser.Scene {
  private stage!: CourtyardStage;
  private hud!: GameHud;
  private infoBar!: InfoBar;
  private cards: ArenaCard[] = [];
  private leftArrow!: IconButton;
  private rightArrow!: IconButton;
  private confirm!: ArcadeButton;
  private unsubscribe: (() => void) | null = null;
  private snapshot!: ArenaSceneSnapshot;
  private transitioning = false;
  private lastKeyStamp = -1;

  constructor() {
    super(SCENE_KEYS.ARENA_SELECT);
  }

  init(data?: { from?: string }): void {
    this.cards = [];
    this.transitioning = false;
    this.lastKeyStamp = -1;
    this.snapshot = {
      sceneKey: SCENE_KEYS.ARENA_SELECT,
      selectedId: ArenaSelection.getInstance().selected.id,
      selectedIndex: ArenaSelection.getInstance().selectedIndex,
      cardCount: 0,
      pressCounts: ARENAS.map(() => 0),
      arrowCounts: [0, 0],
      confirmCount: 0,
      backCount: 0,
      transitionedFrom: data?.from ?? null,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.stage = new CourtyardStage(this, {
      layout: CHARACTER_STAGE_LAYOUT,
      depth: ARENA_DEPTH,
      petalCount: 14,
      scrimAlpha: 0.4,
      seed: 0x6a10bd,
    });
    new ScreenHeader(this, {
      title: 'SELECT ARENA',
      layout: ARENA_LAYOUT.header,
      depth: ARENA_DEPTH.HEADER,
    });
    this.hud = new GameHud({
      scene: this,
      hud: ARENA_LAYOUT.hud,
      depth: ARENA_DEPTH.HUD,
      back: ARENA_LAYOUT.back,
      onBack: () => this.goBack(),
    });
    this.infoBar = new InfoBar(this, {
      layout: ARENA_LAYOUT.info,
      depth: ARENA_DEPTH.INFO,
      fadeMs: 140,
    });

    const C = ARENA_LAYOUT.cards;
    ARENAS.forEach((config, index) => {
      const card = new ArenaCard(this, config, index, {
        x: C.left + C.width / 2 + index * C.stride,
        y: C.centerY,
        width: C.width,
        height: C.height,
        depth: ARENA_DEPTH.CARDS,
        onSelect: (i) => this.selectCard(i),
        onHover: (i) => this.onHover(i),
      });
      this.cards.push(card);
    });

    this.leftArrow = new IconButton(this, {
      x: ARENA_LAYOUT.arrows.leftX,
      y: ARENA_LAYOUT.arrows.y,
      width: ARENA_LAYOUT.arrows.width,
      height: ARENA_LAYOUT.arrows.height,
      icon: 'chevron-left',
      iconSize: 14,
      depth: ARENA_DEPTH.CONTROLS,
      onSelect: () => this.step(-1),
    });
    this.rightArrow = new IconButton(this, {
      x: ARENA_LAYOUT.arrows.rightX,
      y: ARENA_LAYOUT.arrows.y,
      width: ARENA_LAYOUT.arrows.width,
      height: ARENA_LAYOUT.arrows.height,
      icon: 'chevron-right',
      iconSize: 14,
      depth: ARENA_DEPTH.CONTROLS,
      onSelect: () => this.step(1),
    });
    this.confirm = new ArcadeButton(this, {
      x: ARENA_LAYOUT.confirm.x,
      y: ARENA_LAYOUT.confirm.y,
      width: ARENA_LAYOUT.confirm.width,
      height: ARENA_LAYOUT.confirm.height,
      label: 'CONFIRM',
      variant: 'primary',
      icon: 'check',
      fontSize: 13,
      onSelect: () => this.confirmSelection(),
    });

    const manager = ArenaSelection.getInstance();
    this.unsubscribe = manager.subscribe((change) => this.applySelection(change.config.id));
    this.applySelection(manager.selected.id, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detach, this);
    this.bindKeyboard();

    this.cameras.main.fadeIn(ARENA_CONFIG.FADE_IN_MS, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.ARENA_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:arena-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    this.stage.update(time, delta);
    this.hud.update(time);
    for (const card of this.cards) card.update(time);
    this.leftArrow.update(time);
    this.rightArrow.update(time);
  }

  private bindKeyboard(): void {
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
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.transitioning || event.repeat || event.timeStamp <= this.lastKeyStamp) return;
    this.lastKeyStamp = event.timeStamp;
    const code = event.code;
    if (code === 'ArrowLeft' || code === 'KeyA') this.step(-1);
    else if (code === 'ArrowRight' || code === 'KeyD') this.step(1);
    else if (code === 'Enter' || code === 'Space') this.confirmSelection();
    else if (code === 'Escape' || code === 'Backspace') this.goBack();
  };

  private onHover(index: number): void {
    const config = ARENAS[index];
    if (config) this.infoBar.setDescription(`${config.name} — ${config.tagline}`);
    this.publish();
  }

  private selectCard(index: number): void {
    if (this.transitioning) return;
    const config = ARENAS[index];
    if (!config) return;
    const counts = [...this.snapshot.pressCounts];
    counts[index] = (counts[index] ?? 0) + 1;
    this.snapshot.pressCounts = counts;
    ArenaSelection.getInstance().select(config.id, 'card');
    playSfx(SFX.UI_CLICK);
    this.infoBar.setDescription(`${config.name} — ${config.tagline}`);
    this.publish();
  }

  private step(delta: number): void {
    if (this.transitioning) return;
    const counts: [number, number] = [...this.snapshot.arrowCounts] as [number, number];
    counts[delta < 0 ? 0 : 1] += 1;
    this.snapshot.arrowCounts = counts;
    const config = ArenaSelection.getInstance().step(delta, 'arrow');
    if (config) this.infoBar.setDescription(`${config.name} — ${config.tagline}`);
    playSfx(SFX.UI_CLICK);
    this.publish();
  }

  private applySelection(id: string, immediate = false): void {
    const manager = ArenaSelection.getInstance();
    this.cards.forEach((card, index) => card.setSelected(ARENAS[index]?.id === id));
    const config = manager.selected;
    this.snapshot.selectedId = config.id;
    this.snapshot.selectedIndex = manager.selectedIndex;
    this.snapshot.cardCount = this.cards.length;
    if (immediate) this.infoBar.setDescription(`${config.name} — ${config.tagline}`, true);
    this.publish();
  }

  private confirmSelection(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.confirmCount += 1;
    this.hud.setEnabled(false);
    this.leftArrow.setEnabled(false);
    this.rightArrow.setEnabled(false);
    this.confirm.setEnabled(false);
    for (const card of this.cards) card.setEnabled(false);
    playSfx(SFX.UI_CONFIRM);
    this.publish();
    this.cameras.main.fadeOut(ARENA_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.ARENA_PREVIEW, { from: SCENE_KEYS.ARENA_SELECT });
    });
  }

  private goBack(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.backCount += 1;
    this.hud.setEnabled(false);
    this.leftArrow.setEnabled(false);
    this.rightArrow.setEnabled(false);
    this.confirm.setEnabled(false);
    for (const card of this.cards) card.setEnabled(false);
    playSfx(SFX.UI_BACK);
    this.publish();
    this.cameras.main.fadeOut(ARENA_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.CHARACTER_SELECT, { from: SCENE_KEYS.ARENA_SELECT });
    });
  }

  private readonly detach = (): void => {
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.unsubscribe?.();
    this.unsubscribe = null;
  };

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.ARENA_SCENE_STATE, {
      ...this.snapshot,
      pressCounts: [...this.snapshot.pressCounts],
      arrowCounts: [...this.snapshot.arrowCounts],
    });
  }
}
