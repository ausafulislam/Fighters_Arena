import Phaser from 'phaser';

import { PALETTE_HEX } from '@/constants/palette';
import type { TouchControlSize } from '@/types/welcome';
import { DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { clamp } from '@/utils/math';
import { octagon } from '@/utils/shapes';

export interface SegmentOption {
  label: string;
  value: TouchControlSize;
}

export interface SegmentedControlOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  options: readonly SegmentOption[];
  value: TouchControlSize;
  parent: Phaser.GameObjects.Container;
  onChange: (value: TouchControlSize) => void;
}

/** Three-way selection control for Touch Control Size. */
export class SegmentedControl {
  private readonly options: SegmentedControlOptions;
  private readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private value: TouchControlSize;

  constructor(scene: Phaser.Scene, options: SegmentedControlOptions) {
    this.options = options;
    this.value = options.value;

    this.container = scene.add.container(options.x, options.y);
    options.parent.add(this.container);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    const segmentWidth = options.width / options.options.length;
    options.options.forEach((option, index) => {
      const cx = -options.width / 2 + segmentWidth * (index + 0.5);
      const text = scene.add
        .text(cx, 0, option.label, {
          fontFamily: DISPLAY_MEDIUM_FONT,
          fontSize: '9px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5);
      this.labels.push(text);
      this.container.add(text);
    });

    this.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -options.width / 2,
        -options.height / 2,
        options.width,
        options.height,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);

    this.render();
  }

  private readonly onPointerDown = (_pointer: Phaser.Input.Pointer, localX: number): void => {
    const segmentWidth = this.options.width / this.options.options.length;
    const index = clamp(
      Math.floor((localX + this.options.width / 2) / segmentWidth),
      0,
      this.options.options.length - 1,
    );
    const option = this.options.options[index];
    if (!option || option.value === this.value) return;
    this.value = option.value;
    this.render();
    this.options.onChange(option.value);
  };

  private render(): void {
    const { width, height } = this.options;
    const g = this.graphics;
    const segmentWidth = width / this.options.options.length;
    g.clear();

    g.fillStyle(0x000000, 0.5);
    g.fillPoints(octagon(width, height, 5, 1, 2), true);
    g.fillStyle(0x262431, 1);
    g.fillPoints(octagon(width, height, 5), true);

    const activeIndex = Math.max(
      0,
      this.options.options.findIndex((option) => option.value === this.value),
    );
    const cx = -width / 2 + segmentWidth * (activeIndex + 0.5);
    g.fillStyle(0xff6a08, 1);
    g.fillPoints(octagon(segmentWidth - 4, height - 4, 3, cx, 0), true);
    g.lineStyle(1, PALETTE_HEX.gold, 0.9);
    g.strokePoints(octagon(segmentWidth - 4, height - 4, 3, cx, 0), true);

    g.lineStyle(1.5, 0x6b637d, 1);
    g.strokePoints(octagon(width, height, 5), true);
    for (let i = 1; i < this.options.options.length; i += 1) {
      const x = -width / 2 + segmentWidth * i;
      g.lineStyle(1, 0x514b60, 0.8);
      g.beginPath();
      g.moveTo(x, -height / 2 + 4);
      g.lineTo(x, height / 2 - 4);
      g.strokePath();
    }

    this.labels.forEach((label, index) => {
      label.setColor(index === activeIndex ? '#FFFFFF' : '#A9A3B8');
    });
  }

  get current(): TouchControlSize {
    return this.value;
  }
}
