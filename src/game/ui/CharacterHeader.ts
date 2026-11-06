import type Phaser from 'phaser';

import { CHARACTER_DEPTH, CHARACTER_HEADER_TITLE, CHARACTER_LAYOUT } from '@/constants/characters';

import { ScreenHeader } from './ScreenHeader';

/** Phase 5 preset for the shared arcade header component. */
export class CharacterHeader extends ScreenHeader {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      title: CHARACTER_HEADER_TITLE,
      layout: CHARACTER_LAYOUT.header,
      depth: CHARACTER_DEPTH.HEADER,
    });
  }
}
