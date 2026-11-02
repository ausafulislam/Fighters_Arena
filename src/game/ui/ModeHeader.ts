import type Phaser from 'phaser';

import { MODE_DEPTH, MODE_LAYOUT } from '@/constants/gameModes';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_FONT } from '@/utils/fonts';
import { drawDiamond, octagon } from '@/utils/shapes';
import { tracked } from '@/utils/typography';

export const MODE_HEADER_TITLE = 'SELECT GAME MODE';

/** Balanced orange-accented title frame with two short decorative wings. */
export class ModeHeader {
  constructor(scene: Phaser.Scene) {
    const { x, y, width, height, cut } = MODE_LAYOUT.header;
    const g = scene.add.graphics().setDepth(MODE_DEPTH.HEADER);

    // Wings: a single crisp bar plus one diamond on each side.
    for (const dir of [-1, 1]) {
      const start = x + dir * (width / 2 + 10);
      const end = x + dir * (width / 2 + 62);
      g.fillStyle(PALETTE_HEX.deepOrange, 1);
      g.fillRect(Math.min(start, end), y - 3, Math.abs(end - start), 4);
      g.fillStyle(PALETTE_HEX.orange, 1);
      g.fillRect(Math.min(start, end), y - 2, Math.abs(end - start), 2);
      drawDiamond(g, end, y, 4, PALETTE_HEX.gold);
    }

    g.fillStyle(0x000000, 0.55);
    g.fillPoints(octagon(width, height, cut, x + 2, y + 3), true);
    g.fillStyle(0x16141f, 0.97);
    g.fillPoints(octagon(width, height, cut, x, y), true);
    g.fillStyle(PALETTE_HEX.deepPurple, 0.3);
    g.fillRect(x - width / 2 + cut + 3, y - height / 2 + 3, width - 2 * cut - 6, height - 6);

    g.lineStyle(2.5, PALETTE_HEX.orange, 1);
    g.strokePoints(octagon(width, height, cut, x, y), true);
    g.lineStyle(1, PALETTE_HEX.gold, 0.75);
    g.strokePoints(octagon(width - 7, height - 7, cut - 2, x, y), true);

    // A slim lower tab echoes the reference without adding clutter.
    g.fillStyle(0x16141f, 1);
    g.fillPoints(octagon(76, 9, 3, x, y + height / 2 + 4), true);
    g.lineStyle(1, PALETTE_HEX.orange, 0.9);
    g.strokePoints(octagon(76, 9, 3, x, y + height / 2 + 4), true);
    drawDiamond(g, x, y + height / 2 + 4, 2.5, PALETTE_HEX.gold);

    tracked(
      scene,
      x,
      y - 1,
      MODE_HEADER_TITLE,
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '17px',
        color: '#FFFFFF',
        stroke: '#1A0D06',
        strokeThickness: 3,
      },
      1.1,
    )
      .setOrigin(0.5)
      .setDepth(MODE_DEPTH.HEADER + 1)
      .setShadow(0, 2, '#000000', 3, false, true);
  }
}
