import type Phaser from 'phaser';

import { MODE_DEPTH, MODE_LAYOUT } from '@/constants/gameModes';

import { ScreenHeader } from './ScreenHeader';

export const MODE_HEADER_TITLE = 'SELECT GAME MODE';

/** Phase 4 preset for the shared arcade header component. */
export class ModeHeader extends ScreenHeader {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      title: MODE_HEADER_TITLE,
      layout: MODE_LAYOUT.header,
      depth: MODE_DEPTH.HEADER,
    });
  }
}
