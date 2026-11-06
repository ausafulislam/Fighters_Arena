import Phaser from 'phaser';

import type { GameHudOptions, HudBadgeKind } from '@/constants/hud';
import { GAME_EVENTS } from '@/constants/scenes';
import { PALETTE_HEX } from '@/constants/palette';
import { AudioManager } from '@/game/audio/AudioManager';
import { FullscreenManager } from '@/game/config/FullscreenManager';
import { addIcon, iconTextureKey } from '@/utils/icons';
import { lerp } from '@/utils/math';
import { hexagon } from '@/utils/shapes';
import { createSoftGlowTexture, RUNTIME_TEXTURES } from '@/utils/textures';
import type { FullscreenSnapshot } from '@/types/system';
import type { AudioSnapshot } from '@/types/audio';

interface HudBadge {
  kind: HudBadgeKind | 'back';
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  frame: Phaser.GameObjects.Graphics;
  iconImage: Phaser.GameObjects.Image;
  hovered: boolean;
  pressed: boolean;
  enabled: boolean;
  activate: () => void;
}

/**
 * The ONE system HUD used by Welcome, Game Mode Selection and Character
 * Selection. Volume/fullscreen badges are real controls wired to the game-level
 * AudioManager / FullscreenManager; their icons are swapped immediately from
 * manager events, including changes made through browser controls.
 *
 * A badge is a hexagon-shaped container with a Lucide SVG icon. No emoji, no
 * text glyphs, no per-screen copies of audio/fullscreen logic.
 */
export class GameHud {
  private readonly scene: Phaser.Scene;
  private readonly options: GameHudOptions;
  private readonly badges: HudBadge[] = [];
  private enabled = true;

  constructor(options: GameHudOptions) {
    this.scene = options.scene;
    this.options = options;
    createSoftGlowTexture(this.scene);

    for (const position of options.hud.icons) {
      this.badges.push(
        this.createBadge(
          position.kind,
          position.x,
          options.hud.y,
          options.hud.width,
          options.hud.height,
          15,
          position.kind === 'volume'
            ? () => AudioManager.getInstance().toggleMuted()
            : () => void FullscreenManager.getInstance().toggle(),
        ),
      );
    }

    if (options.back && options.onBack) {
      this.badges.push(
        this.createBadge(
          'back',
          options.back.x,
          options.back.y,
          options.back.width,
          options.back.height,
          18,
          options.onBack,
          true,
        ),
      );
    }

    this.scene.game.events.on(GAME_EVENTS.AUDIO_CHANGED, this.syncIcons, this);
    this.scene.game.events.on(GAME_EVENTS.FULLSCREEN_CHANGED, this.syncIcons, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.syncIcons();
  }

  private createBadge(
    kind: HudBadge['kind'],
    x: number,
    y: number,
    width: number,
    height: number,
    iconSize: number,
    activate: () => void,
    isBack = false,
  ): HudBadge {
    const { scene, options } = this;
    const cut = isBack ? 7 : 6;
    const container = scene.add.container(x, y).setDepth(options.depth);

    const glow = scene.add
      .image(0, 0, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(width + 24, height + 22)
      .setAlpha(0);

    const frame = scene.add.graphics();
    frame.fillStyle(0x000000, 0.55);
    frame.fillPoints(hexagon(width, height, cut, 1, 2), true);
    frame.fillStyle(isBack ? 0x2a2118 : 0x23212c, 1);
    frame.fillPoints(hexagon(width, height, cut), true);
    frame.lineStyle(isBack ? 2.5 : 2, PALETTE_HEX.gold, 1);
    frame.strokePoints(hexagon(width, height, cut), true);
    frame.lineStyle(1, PALETTE_HEX.deepOrange, 0.75);
    frame.strokePoints(hexagon(width - 6, height - 6, Math.max(3, cut - 2)), true);

    const iconName = kind === 'back' ? 'arrow-left' : kind === 'volume' ? 'volume-2' : 'maximize';
    const iconImage = addIcon(scene, isBack ? -1 : 0, 0, iconName, iconSize, PALETTE_HEX.gold);
    container.add([glow, frame, iconImage]);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    const badge: HudBadge = {
      kind,
      container,
      glow,
      frame,
      iconImage,
      hovered: false,
      pressed: false,
      enabled: true,
      activate,
    };

    container.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (!badge.enabled || !this.enabled) return;
      badge.hovered = true;
      document.body.style.cursor = 'pointer';
    });
    container.on(Phaser.Input.Events.POINTER_OUT, () => {
      badge.hovered = false;
      badge.pressed = false;
      document.body.style.cursor = '';
    });
    container.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!badge.enabled || !this.enabled) return;
      badge.pressed = true;
    });
    container.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!badge.enabled || !this.enabled || !badge.pressed) return;
      badge.pressed = false;
      // Fullscreen API calls happen synchronously inside this real gesture.
      badge.activate();
    });
    container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      badge.pressed = false;
    });
    return badge;
  }

  /** Immediate icon swap from the authoritative manager state. */
  private readonly syncIcons = (_audio?: AudioSnapshot, _fullscreen?: FullscreenSnapshot): void => {
    const audio = AudioManager.getInstance().getSnapshot();
    const fullscreen = FullscreenManager.getInstance().getSnapshot();

    for (const badge of this.badges) {
      if (badge.kind === 'volume') {
        const name = audio.muted ? 'volume-x' : 'volume-2';
        badge.iconImage
          .setTexture(iconTextureKey(name))
          .setDisplaySize(15, 15)
          .setTint(audio.muted ? 0x9b92a8 : PALETTE_HEX.gold);
      } else if (badge.kind === 'fullscreen') {
        const name = fullscreen.active ? 'minimize' : 'maximize';
        badge.iconImage
          .setTexture(iconTextureKey(name))
          .setDisplaySize(15, 15)
          .setTint(fullscreen.supported ? PALETTE_HEX.gold : 0x6b637d);
        badge.frame.setAlpha(fullscreen.supported ? 1 : 0.55);
        badge.iconImage.setAlpha(fullscreen.supported ? 1 : 0.5);
        badge.enabled = fullscreen.supported;
      } else if (badge.kind === 'back') {
        badge.iconImage.setTint(badge.hovered ? PALETTE_HEX.white : PALETTE_HEX.gold);
      }
    }
  };

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      for (const badge of this.badges) {
        badge.hovered = false;
        badge.pressed = false;
      }
      document.body.style.cursor = '';
    }
  }

  update(timeMs: number): void {
    for (const badge of this.badges) {
      const live = this.enabled && badge.enabled;
      const target = live
        ? badge.hovered
          ? 0.55 + Math.sin(timeMs * 0.004) * 0.08
          : badge.kind === 'back'
            ? 0.08
            : 0
        : 0;
      badge.glow.setAlpha(lerp(badge.glow.alpha, target, 0.18));
      const scale = !live ? 1 : badge.pressed ? 0.96 : badge.hovered ? 1.06 : 1;
      badge.container.setScale(lerp(badge.container.scaleX, scale, 0.22));
      if (badge.kind === 'back') {
        badge.iconImage.setTint(badge.hovered && live ? PALETTE_HEX.white : PALETTE_HEX.gold);
      }
    }
  }

  destroy(): void {
    this.scene.game.events.off(GAME_EVENTS.AUDIO_CHANGED, this.syncIcons, this);
    this.scene.game.events.off(GAME_EVENTS.FULLSCREEN_CHANGED, this.syncIcons, this);
    document.body.style.cursor = '';
  }
}
