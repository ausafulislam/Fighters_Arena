import type Phaser from 'phaser';

import { CHARACTER_CONFIG, CHARACTER_DEPTH, CHARACTER_LAYOUT } from '@/constants/characters';

import { InfoBar } from './InfoBar';

/** Phase 5 preset for the shared bottom information bar. */
export class CharacterInfoBar extends InfoBar {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      layout: CHARACTER_LAYOUT.info,
      depth: CHARACTER_DEPTH.INFO,
      fadeMs: CHARACTER_CONFIG.INFO_FADE_MS,
    });
  }
}
