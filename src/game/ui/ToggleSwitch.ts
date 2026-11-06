import Phaser from 'phaser';

import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { octagon } from '@/utils/shapes';
import { addUiText } from '@/utils/typography';

export interface ToggleSwitchOptions {
  x: number;
  y: number;
  value: boolean;
  onLabel: string;
  offLabel: string;
  parent: Phaser.GameObjects.Container;
  onChange: (value: boolean) => void;
}

/** Compact pixel-styled ON/OFF switch with a sliding knob and state label. */
export class ToggleSwitch {
  private readonly scene: Phaser.Scene;
  private readonly options: ToggleSwitchOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Rectangle;
  private readonly stateText: Phaser.GameObjects.Text;
  private value: boolean;

  constructor(scene: Phaser.Scene, options: ToggleSwitchOptions) {
    this.scene = scene;
    this.options = options;
    this.value = options.value;

    this.container = scene.add.container(options.x, options.y);
    options.parent.add(this.container);

    this.stateText = addUiText(scene, -30, 0, '', {
      fontFamily: DISPLAY_MEDIUM_FONT,
      fontSize: '9px',
      color: '#FFC247',
    }).setOrigin(1, 0.5);
    this.track = scene.add.graphics();
    this.knob = scene.add.rectangle(0, 0, 12, 12, 0xf5f0fa).setStrokeStyle(1, 0x3a3648);

    this.container.add([this.stateText, this.track, this.knob]);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-92, -12, 120, 24),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.toggle, this);

    this.render(false);
  }

  private readonly toggle = (): void => {
    this.setValue(!this.value, true);
  };

  setValue(value: boolean, notify: boolean): void {
    this.value = value;
    this.render(true);
    if (notify) this.options.onChange(value);
  }

  private render(animate: boolean): void {
    const g = this.track;
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillPoints(octagon(46, 18, 4, 1, 2), true);
    g.fillStyle(this.value ? 0xff6a08 : 0x2a2834, 1);
    g.fillPoints(octagon(46, 18, 4), true);
    g.fillStyle(0xffffff, this.value ? 0.14 : 0.05);
    g.fillRect(-19, -7, 38, 3);
    g.lineStyle(1.5, this.value ? PALETTE_HEX.gold : 0x6b637d, 1);
    g.strokePoints(octagon(46, 18, 4), true);

    this.stateText.setText(this.value ? this.options.onLabel : this.options.offLabel);
    this.stateText.setColor(this.value ? '#FFC247' : '#9A94AB');

    const targetX = this.value ? 11 : -11;
    if (animate) {
      this.scene.tweens.add({
        targets: this.knob,
        x: targetX,
        duration: 140,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.knob.setX(targetX);
    }
    this.knob.setFillStyle(this.value ? 0xffffff : 0xb9b3c7);
  }

  get current(): boolean {
    return this.value;
  }
}
