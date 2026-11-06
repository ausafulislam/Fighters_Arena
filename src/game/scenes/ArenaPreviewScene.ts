import Phaser from 'phaser';

import { ARENA_CONFIG, ARENA_DEPTH, ARENA_PREVIEW_LAYOUT, LOCK_IN_TEXT } from '@/constants/arenas';
import { CHARACTER_STAGE_LAYOUT } from '@/constants/characters';
import { PALETTE_HEX, BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { playSfx } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import { ArenaPreviewPanels } from '@/game/ui/ArenaPreviewPanels';
import { ArcadeButton } from '@/game/ui/ArcadeButton';
import { CourtyardStage } from '@/game/ui/CourtyardStage';
import { GameHud } from '@/game/ui/GameHud';
import { IconButton } from '@/game/ui/IconButton';
import { ScreenHeader } from '@/game/ui/ScreenHeader';
import { configureSceneCamera } from '@/utils/camera';
import { DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { octagon } from '@/utils/shapes';
import { tracked } from '@/utils/typography';
import type { ArenaConfig, ArenaPreviewSnapshot } from '@/types/arenas';

const L = ARENA_PREVIEW_LAYOUT;

/**
 * Step 2: a separate preview screen with a large image of the SELECTED arena,
 * live left/right panels, working Previous / Next controls and CONFIRM that
 * locks the arena before the VS intro. The same background texture is reused
 * later by the VS intro and the playable match.
 */
export class ArenaPreviewScene extends Phaser.Scene {
  private stage!: CourtyardStage;
  private hud!: GameHud;
  private preview!: Phaser.GameObjects.Image;
  private panels!: ArenaPreviewPanels;
  private previous!: IconButton;
  private next!: IconButton;
  private confirm!: ArcadeButton;
  private unsubscribe: (() => void) | null = null;
  private snapshot!: ArenaPreviewSnapshot;
  private transitioning = false;
  private lastKeyStamp = -1;
  private previewTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super(SCENE_KEYS.ARENA_PREVIEW);
  }

  init(data?: { from?: string }): void {
    this.transitioning = false;
    this.lastKeyStamp = -1;
    void data;
    this.snapshot = {
      sceneKey: SCENE_KEYS.ARENA_PREVIEW,
      selectedId: ArenaSelection.getInstance().selected.id,
      selectedIndex: ArenaSelection.getInstance().selectedIndex,
      previewWidth: L.preview.width,
      previewHeight: L.preview.height,
      previousCount: 0,
      nextCount: 0,
      confirmCount: 0,
      backCount: 0,
      lockText: LOCK_IN_TEXT,
    };
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    this.stage = new CourtyardStage(this, {
      layout: CHARACTER_STAGE_LAYOUT,
      depth: ARENA_DEPTH,
      petalCount: 12,
      scrimAlpha: 0.48,
      seed: 0x6b20cf,
    });
    new ScreenHeader(this, {
      title: 'ARENA PREVIEW',
      layout: L.header,
      depth: ARENA_DEPTH.HEADER,
    });
    this.hud = new GameHud({
      scene: this,
      hud: L.hud,
      depth: ARENA_DEPTH.HUD,
      back: L.back,
      onBack: () => this.goBack(),
    });

    // Large preview with cut corners and a bright arcade frame.
    this.preview = this.add
      .image(L.preview.x, L.preview.y, ArenaSelection.getInstance().selected.backgroundTextureKey)
      .setDisplaySize(L.preview.width, L.preview.height)
      .setDepth(ARENA_DEPTH.PANELS + 1);
    const frame = this.add.graphics().setDepth(ARENA_DEPTH.PANELS + 2);
    frame.lineStyle(3, PALETTE_HEX.orange, 1);
    frame.strokePoints(
      octagon(L.preview.width, L.preview.height, L.preview.cut, L.preview.x, L.preview.y),
      true,
    );
    frame.lineStyle(1, PALETTE_HEX.gold, 0.8);
    frame.strokePoints(
      octagon(
        L.preview.width - 8,
        L.preview.height - 8,
        L.preview.cut - 2,
        L.preview.x,
        L.preview.y,
      ),
      true,
    );
    this.panels = new ArenaPreviewPanels(this, {
      left: L.leftPanel,
      right: L.rightPanel,
      depth: ARENA_DEPTH.PANELS,
    });

    this.previous = new IconButton(this, {
      x: L.previous.x,
      y: L.previous.y,
      width: L.previous.width,
      height: L.previous.height,
      icon: 'chevron-left',
      iconSize: 15,
      depth: ARENA_DEPTH.CONTROLS,
      onSelect: () => this.step(-1),
    });
    this.next = new IconButton(this, {
      x: L.next.x,
      y: L.next.y,
      width: L.next.width,
      height: L.next.height,
      icon: 'chevron-right',
      iconSize: 15,
      depth: ARENA_DEPTH.CONTROLS,
      onSelect: () => this.step(1),
    });
    this.confirm = new ArcadeButton(this, {
      x: L.confirm.x,
      y: L.confirm.y,
      width: L.confirm.width,
      height: L.confirm.height,
      label: 'CONFIRM',
      variant: 'primary',
      icon: 'check',
      fontSize: 13,
      onSelect: () => this.confirmSelection(),
    });
    tracked(
      this,
      L.lock.x,
      L.lock.y,
      LOCK_IN_TEXT,
      {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '12px',
        color: '#FFC247',
      },
      1.1,
    )
      .setOrigin(0.5)
      .setDepth(ARENA_DEPTH.INFO);

    const manager = ArenaSelection.getInstance();
    this.unsubscribe = manager.subscribe((change) => this.applyArena(change.config, false));
    this.applyArena(manager.selected, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detach, this);
    this.bindKeyboard();

    this.cameras.main.fadeIn(ARENA_CONFIG.FADE_IN_MS, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.PREVIEW_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:preview-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    this.stage.update(time, delta);
    this.hud.update(time);
    this.previous.update(time);
    this.next.update(time);
  }

  private bindKeyboard(): void {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([K.LEFT, K.RIGHT, K.ENTER, K.SPACE, K.ESC, K.BACKSPACE]);
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

  private step(delta: number): void {
    if (this.transitioning) return;
    if (delta < 0) this.snapshot.previousCount += 1;
    else this.snapshot.nextCount += 1;
    ArenaSelection.getInstance().step(delta, 'preview');
    playSfx(SFX.UI_CLICK);
    this.publish();
  }

  private applyArena(config: ArenaConfig, immediate: boolean): void {
    this.snapshot.selectedId = config.id;
    this.snapshot.selectedIndex = ArenaSelection.getInstance().selectedIndex;
    this.panels.setArena(config);
    // Set the texture immediately, then cross-fade its alpha. Staggered
    // fade-out/onComplete tweens could apply an older arena last when the
    // player clicks PREVIOUS / NEXT faster than a tween completes.
    this.previewTween?.remove();
    this.previewTween = null;
    this.preview.setTexture(config.backgroundTextureKey);
    if (immediate) {
      this.preview.setAlpha(1);
    } else {
      this.preview.setAlpha(0.2);
      this.previewTween = this.tweens.add({
        targets: this.preview,
        alpha: 1,
        duration: ARENA_CONFIG.PREVIEW_FADE_MS,
        ease: 'Sine.easeOut',
      });
    }
    this.publish();
  }

  private confirmSelection(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.confirmCount += 1;
    this.hud.setEnabled(false);
    this.previous.setEnabled(false);
    this.next.setEnabled(false);
    this.confirm.setEnabled(false);
    playSfx(SFX.UI_CONFIRM);
    this.publish();
    this.cameras.main.fadeOut(ARENA_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.VS_INTRO, { from: SCENE_KEYS.ARENA_PREVIEW });
    });
  }

  private goBack(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.snapshot.backCount += 1;
    this.hud.setEnabled(false);
    this.previous.setEnabled(false);
    this.next.setEnabled(false);
    this.confirm.setEnabled(false);
    playSfx(SFX.UI_BACK);
    this.publish();
    this.cameras.main.fadeOut(ARENA_CONFIG.FADE_OUT_MS, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.ARENA_SELECT, { from: SCENE_KEYS.ARENA_PREVIEW });
    });
  }

  private readonly detach = (): void => {
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.unsubscribe?.();
    this.unsubscribe = null;
  };

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.ARENA_PREVIEW_STATE, { ...this.snapshot });
  }
}
