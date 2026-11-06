import type Phaser from 'phaser';

import { MODE_CONFIG, MODE_DEPTH, MODE_LAYOUT } from '@/constants/gameModes';

import { InfoBar } from './InfoBar';

/** Phase 4 preset for the shared bottom information bar. */
export class ModeInfoBar extends InfoBar {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      layout: MODE_LAYOUT.info,
      depth: MODE_DEPTH.INFO,
      fadeMs: MODE_CONFIG.INFO_FADE_MS,
    });
  }
}
