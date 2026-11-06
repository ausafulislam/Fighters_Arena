import Phaser from 'phaser';

import { ACTION_ICONS, ACTION_LABELS, TOUCH_SIZE_SCALE } from '@/constants/controls';
import { MATCH_DEPTH } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import { BODY_FONT } from '@/utils/fonts';
import { addIcon } from '@/utils/icons';
import type { UiIcon } from '@/utils/icons';
import { lerp } from '@/utils/math';
import { addUiText } from '@/utils/typography';
import type { InputManager } from '@/game/input/InputManager';
import type { FighterAction } from '@/types/input';
import type { MobileSettings, TouchControlSize } from '@/types/welcome';

interface TouchButton {
  action: FighterAction;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  active: boolean;
}

interface ButtonSpec {
  action: FighterAction;
  x: number;
  y: number;
  label: string;
}

/**
 * Layout is derived from the chosen button size, so SMALL / MEDIUM / LARGE
 * preferences can NEVER make two circular hit areas overlap. Left-handed mode
 * mirrors the entire layout instead of duplicating buttons.
 */
function buildSpecs(size: number, leftHanded: boolean): ButtonSpec[] {
  const padGap = size + 8;
  const padCenterX = 76;
  const padCenterY = 270;
  const actionGap = size + 8;
  const actionCenterX = 560;
  const actionTopY = 240;
  const actionBottomY = actionTopY + size + 12;
  const raw: ButtonSpec[] = [
    { action: 'left', x: padCenterX - padGap, y: padCenterY, label: '' },
    { action: 'right', x: padCenterX + padGap, y: padCenterY, label: '' },
    { action: 'up', x: padCenterX, y: padCenterY - padGap, label: '' },
    { action: 'down', x: padCenterX, y: padCenterY + padGap, label: '' },
    { action: 'light_punch', x: actionCenterX - actionGap, y: actionTopY, label: 'PUNCH' },
    { action: 'heavy_punch', x: actionCenterX, y: actionTopY, label: 'HEAVY' },
    { action: 'kick', x: actionCenterX + actionGap, y: actionTopY, label: 'KICK' },
    { action: 'special', x: actionCenterX - actionGap, y: actionBottomY, label: 'SPECIAL' },
    { action: 'block', x: actionCenterX, y: actionBottomY, label: 'BLOCK' },
  ];
  return raw.map((spec) => ({
    ...spec,
    x: leftHanded ? 640 - spec.x : spec.x,
  }));
}

/**
 * Large, non-overlapping touch controls. Supports simultaneous pointers and
 * applies all three saved Settings preferences: show/hide, left-handed layout
 * and touch control size. Hidden on desktop (no coarse pointer).
 */
export class MobileControls {
  private readonly scene: Phaser.Scene;
  private readonly input: InputManager;
  private readonly buttons: TouchButton[] = [];
  private readonly activePointers = new Set<number>();
  private visible: boolean;

  constructor(scene: Phaser.Scene, input: InputManager, settings: MobileSettings) {
    this.scene = scene;
    this.input = input;
    this.visible = settings.showMobileControls && this.hasTouch();

    const scale = TOUCH_SIZE_SCALE[settings.touchControlSize as TouchControlSize] ?? 1;
    const size = Math.round(34 * scale);
    for (const spec of buildSpecs(size, settings.leftHanded)) {
      this.buttons.push(this.createButton(spec, spec.x, size));
    }
    this.setVisible(this.visible);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private hasTouch(): boolean {
    return (
      navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches === true
    );
  }

  private createButton(spec: ButtonSpec, x: number, size: number): TouchButton {
    const { action, y, label } = spec;
    const container = this.scene.add.container(x, y).setDepth(MATCH_DEPTH.TOUCH);
    const glow = this.scene.add
      .image(0, 0, 'fx-soft-glow')
      .setTint(PALETTE_HEX.orange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size + 20, size + 20)
      .setAlpha(0);

    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.55);
    g.fillCircle(1, 2, size / 2 + 2);
    g.fillStyle(0x1c1926, 0.92);
    g.fillCircle(0, 0, size / 2);
    g.lineStyle(2, label ? PALETTE_HEX.orange : PALETTE_HEX.gold, 0.95);
    g.strokeCircle(0, 0, size / 2);
    g.lineStyle(1, PALETTE_HEX.deepPurple, 0.8);
    g.strokeCircle(0, 0, size / 2 - 4);

    const iconImage = addIcon(
      this.scene,
      0,
      label ? -5 : 0,
      ACTION_ICONS[action] as UiIcon,
      Math.round(size * 0.48),
      PALETTE_HEX.gold,
    );
    const children: Phaser.GameObjects.GameObject[] = [glow, g, iconImage];
    if (label) {
      children.push(
        addUiText(this.scene, 0, size / 2 - 7, label || ACTION_LABELS[action], {
          fontFamily: BODY_FONT,
          fontSize: '8px',
          color: '#FFFFFF',
        }).setOrigin(0.5),
      );
    }
    container.add(children);
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, size / 2 + 3),
      Phaser.Geom.Circle.Contains,
    );

    const button: TouchButton = { action, container, glow, active: false };
    container.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!this.visible) return;
      button.active = true;
      this.activePointers.add(pointer.id);
      this.input.setVirtual(action, true);
      this.input.setPointerCount(this.activePointers.size);
    });
    const release = (): void => {
      if (!button.active) return;
      button.active = false;
      this.input.setVirtual(action, false);
    };
    container.on(Phaser.Input.Events.POINTER_UP, release);
    container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    container.on(Phaser.Input.Events.POINTER_OUT, release);
    return button;
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.activePointers.add(pointer.id);
    this.input.setPointerCount(this.activePointers.size);
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    this.activePointers.delete(pointer.id);
    this.input.setPointerCount(this.activePointers.size);
    // Safety net: a finger lifted outside its button must not leave a held key.
    if (this.activePointers.size === 0) {
      for (const button of this.buttons) {
        if (button.active) {
          button.active = false;
          this.input.setVirtual(button.action, false);
        }
      }
    }
  };

  get isVisible(): boolean {
    return this.visible;
  }

  setVisible(value: boolean): void {
    this.visible = value;
    for (const button of this.buttons) {
      button.container.setVisible(value);
      if (!value && button.active) {
        button.active = false;
        this.input.setVirtual(button.action, false);
      }
    }
  }

  get buttonCount(): number {
    return this.buttons.length;
  }

  update(timeMs: number): void {
    if (!this.visible) return;
    for (const button of this.buttons) {
      const target = button.active ? 0.6 + Math.sin(timeMs * 0.01) * 0.08 : 0.08;
      button.glow.setAlpha(lerp(button.glow.alpha, target, 0.25));
      const scale = button.active ? 0.94 : 1;
      button.container.setScale(lerp(button.container.scaleX, scale, 0.3));
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    for (const button of this.buttons) {
      if (button.active) this.input.setVirtual(button.action, false);
      button.container.destroy();
    }
    this.buttons.length = 0;
  }
}
