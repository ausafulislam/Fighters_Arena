import type Phaser from 'phaser';

import { ARENA_FEATURES } from '@/constants/arenas';
import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_FONT, DISPLAY_MEDIUM_FONT, BODY_FONT } from '@/utils/fonts';
import { addIcon } from '@/utils/icons';
import type { UiIcon } from '@/utils/icons';
import { octagon } from '@/utils/shapes';
import { addUiText, tracked } from '@/utils/typography';
import type { ArenaConfig } from '@/types/arenas';

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArenaPreviewPanelsOptions {
  left: PanelRect;
  right: PanelRect;
  depth: number;
}

/** Left: selected arena summary. Right: three environment features. */
export class ArenaPreviewPanels {
  private readonly scene: Phaser.Scene;
  private readonly options: ArenaPreviewPanelsOptions;
  private readonly thumbnail: Phaser.GameObjects.Image;
  private readonly name: Phaser.GameObjects.Text;
  private readonly category: Phaser.GameObjects.Text;
  private readonly description: Phaser.GameObjects.Text;
  private readonly featureRows: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, options: ArenaPreviewPanelsOptions) {
    this.scene = scene;
    this.options = options;
    const { left, right, depth } = options;

    this.panel(left, 'SELECTED ARENA', depth);
    this.panel(right, 'ARENA FEATURES', depth);

    this.thumbnail = scene.add
      .image(left.x, left.y - 48, '')
      .setDisplaySize(left.width - 20, 62)
      .setDepth(depth + 2);
    const thumbFrame = scene.add.graphics().setDepth(depth + 1);
    thumbFrame.lineStyle(2, PALETTE_HEX.orange, 1);
    thumbFrame.strokePoints(octagon(left.width - 16, 66, 7, left.x, left.y - 48), true);

    this.name = tracked(
      scene,
      left.x,
      left.y + 2,
      '',
      {
        fontFamily: DISPLAY_FONT,
        fontSize: '13px',
        color: '#FFFFFF',
      },
      0.4,
    )
      .setOrigin(0.5)
      .setDepth(depth + 2);
    this.category = addUiText(scene, left.x, left.y + 19, '', {
      fontFamily: BODY_FONT,
      fontSize: '10px',
      color: '#FFC247',
    })
      .setOrigin(0.5)
      .setDepth(depth + 2);
    this.description = addUiText(scene, left.x, left.y + 42, '', {
      fontFamily: BODY_FONT,
      fontSize: '9px',
      color: '#DCD6E8',
      align: 'center',
      wordWrap: { width: left.width - 26 },
      lineSpacing: 1,
    })
      .setOrigin(0.5, 0)
      .setDepth(depth + 2);
    const divider = scene.add.graphics().setDepth(depth + 1);
    divider.lineStyle(1, PALETTE_HEX.deepPurple, 0.9);
    divider.lineBetween(
      left.x - left.width / 2 + 14,
      left.y + 31,
      left.x + left.width / 2 - 14,
      left.y + 31,
    );

    for (let i = 0; i < 3; i += 1) {
      const y = right.y - 42 + i * 44;
      const icon = addIcon(
        scene,
        right.x - right.width / 2 + 22,
        y,
        'sparkles',
        18,
        PALETTE_HEX.gold,
      ).setDepth(depth + 2);
      icon.setName(`feature-icon-${i}`);
      const row = addUiText(scene, right.x - right.width / 2 + 42, y - 9, '', {
        fontFamily: BODY_FONT,
        fontSize: '10px',
        color: '#FFFFFF',
        align: 'left',
        lineSpacing: 1,
      }).setDepth(depth + 2);
      this.featureRows.push(row);
      const line = scene.add.graphics().setDepth(depth + 1);
      if (i < 2) {
        line.lineStyle(1, PALETTE_HEX.deepPurple, 0.6);
        line.lineBetween(
          right.x - right.width / 2 + 12,
          y + 21,
          right.x + right.width / 2 - 12,
          y + 21,
        );
      }
    }
  }

  private panel(rect: PanelRect, title: string, depth: number): void {
    const g = this.scene.add.graphics().setDepth(depth);
    g.fillStyle(0x000000, 0.62);
    g.fillPoints(octagon(rect.width, rect.height, 10, rect.x + 2, rect.y + 3), true);
    g.fillStyle(0x14121c, 0.96);
    g.fillPoints(octagon(rect.width, rect.height, 10, rect.x, rect.y), true);
    g.lineStyle(1.5, PALETTE_HEX.orange, 1);
    g.strokePoints(octagon(rect.width, rect.height, 10, rect.x, rect.y), true);
    g.lineStyle(1, PALETTE_HEX.gold, 0.5);
    g.strokePoints(octagon(rect.width - 7, rect.height - 7, 8, rect.x, rect.y), true);

    tracked(
      this.scene,
      rect.x,
      rect.y - rect.height / 2 + 17,
      title,
      {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '11px',
        color: '#FFC247',
      },
      0.6,
    )
      .setOrigin(0.5)
      .setDepth(depth + 2);
    const divider = this.scene.add.graphics().setDepth(depth + 1);
    divider.lineStyle(1, PALETTE_HEX.orange, 0.9);
    divider.lineBetween(
      rect.x - rect.width / 2 + 12,
      rect.y - rect.height / 2 + 30,
      rect.x + rect.width / 2 - 12,
      rect.y - rect.height / 2 + 30,
    );
  }

  setArena(config: ArenaConfig): void {
    this.thumbnail
      .setTexture(config.cardTextureKey)
      .setDisplaySize(this.options.left.width - 20, 62);
    this.name.setText(config.name);
    this.fit(this.name, this.options.left.width - 18, 13, 9);
    this.category.setText(config.category);
    this.description.setText(config.description);

    const features = ARENA_FEATURES[config.id];
    this.featureRows.forEach((row, index) => {
      const feature = features[index];
      if (!feature) {
        row.setText('');
        return;
      }
      row.setText(`${feature.label}\n${feature.detail}`);
      const icon = this.scene.children.getByName(
        `feature-icon-${index}`,
      ) as Phaser.GameObjects.Image | null;
      icon?.setTexture(`ui-icon-${feature.icon as UiIcon}`).setTint(config.accent);
    });
  }

  private fit(text: Phaser.GameObjects.Text, maxWidth: number, start: number, min: number): void {
    let size = start;
    while (text.width > maxWidth && size > min) {
      size -= 0.5;
      text.setFontSize(size);
    }
  }
}
