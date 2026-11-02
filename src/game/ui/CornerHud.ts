import type Phaser from 'phaser';

import { WELCOME_DEPTH, WELCOME_LAYOUT } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import { addIcon } from '@/utils/icons';
import { hexagon } from '@/utils/shapes';

/**
 * Top-right volume / fullscreen badges. Visual-only in this phase: they are
 * deliberately not interactive, so they cannot imply unfinished features.
 */
export class CornerHud {
  constructor(scene: Phaser.Scene) {
    const { cornerHud } = WELCOME_LAYOUT;

    for (const icon of cornerHud.icons) {
      const g = scene.add.graphics().setDepth(WELCOME_DEPTH.CORNER_HUD);
      const pts = hexagon(cornerHud.width, cornerHud.height, 6, icon.x, cornerHud.y);

      g.fillStyle(0x000000, 0.55);
      g.fillPoints(
        hexagon(cornerHud.width, cornerHud.height, 6, icon.x + 1, cornerHud.y + 2),
        true,
      );
      g.fillStyle(0x23212c, 1);
      g.fillPoints(pts, true);
      g.lineStyle(2, PALETTE_HEX.gold, 1);
      g.strokePoints(pts, true);
      g.lineStyle(1, PALETTE_HEX.deepOrange, 0.75);
      g.strokePoints(
        hexagon(cornerHud.width - 6, cornerHud.height - 6, 4, icon.x, cornerHud.y),
        true,
      );

      addIcon(scene, icon.x, cornerHud.y, icon.icon, 15, PALETTE_HEX.gold).setDepth(
        WELCOME_DEPTH.CORNER_HUD + 1,
      );
    }
  }
}
