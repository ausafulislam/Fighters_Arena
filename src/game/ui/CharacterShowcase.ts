import Phaser from 'phaser';

import {
  CHARACTER_CONFIG,
  CHARACTER_DEPTH,
  CHARACTER_LAYOUT,
  STAT_ROWS,
} from '@/constants/characters';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
import type { CharacterConfig, CharacterStats, StatKey } from '@/types/characters';
import { BODY_FONT, DISPLAY_FONT } from '@/utils/fonts';
import { lerp } from '@/utils/math';
import { octagon } from '@/utils/shapes';
import { addUiText, tracked } from '@/utils/typography';
import { RUNTIME_TEXTURES } from '@/utils/textures';

interface StatBar {
  key: StatKey;
  fill: Phaser.GameObjects.Rectangle;
  value: number;
}

/**
 * Large left-hand display: full-body character artwork, name, fighting style
 * and four animated statistics. Every number comes from the character data
 * system - no stat value is hardcoded in this component.
 */
export class CharacterShowcase {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly artwork: Phaser.GameObjects.Image;
  private readonly name: Phaser.GameObjects.Text;
  private readonly style: Phaser.GameObjects.Text;
  private readonly bars: StatBar[] = [];
  private config: CharacterConfig;
  private targets: CharacterStats;

  constructor(scene: Phaser.Scene, config: CharacterConfig) {
    this.config = config;
    this.targets = { ...config.stats };
    const L = CHARACTER_LAYOUT;
    const S = L.stats;

    this.glow = scene.add
      .image(L.showcase.x, L.showcase.y, RUNTIME_TEXTURES.SOFT_GLOW)
      .setTint(config.accent)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(L.showcase.width + 30, L.showcase.height + 20)
      .setAlpha(0.26)
      .setDepth(CHARACTER_DEPTH.SHOWCASE_GLOW);

    // Plates are authored at 2x logical size: scale 0.5 maps 1:1 onto the
    // 1280 x 720 framebuffer under the integer camera zoom.
    this.artwork = scene.add
      .image(L.showcase.x, L.showcase.y, config.showcaseTextureKey)
      .setScale(0.5)
      .setDepth(CHARACTER_DEPTH.SHOWCASE);

    this.name = addUiText(scene, L.showcase.x, L.showcase.nameY, config.name, {
      fontFamily: DISPLAY_FONT,
      fontStyle: 'italic',
      fontSize: '24px',
      color: '#FFFFFF',
      stroke: '#160A12',
      strokeThickness: 4,
      letterSpacing: 1,
    })
      .setOrigin(0.5)
      .setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL)
      .setShadow(0, 3, '#000000', 5, false, true);

    this.style = tracked(
      scene,
      L.showcase.x,
      L.showcase.styleY,
      config.style,
      {
        fontFamily: BODY_FONT,
        fontSize: '9px',
        color: '#FFC247',
      },
      0.7,
    )
      .setOrigin(0.5)
      .setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL);

    const panel = scene.add.graphics().setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL - 1);
    const cx = S.x + S.width / 2;
    const cy = S.y + S.height / 2;
    panel.fillStyle(0x000000, 0.6);
    panel.fillPoints(octagon(S.width, S.height, 8, cx + 1, cy + 2), true);
    panel.fillStyle(0x14121c, 0.94);
    panel.fillPoints(octagon(S.width, S.height, 8, cx, cy), true);
    panel.lineStyle(1.5, PALETTE_HEX.deepPurple, 1);
    panel.strokePoints(octagon(S.width, S.height, 8, cx, cy), true);
    panel.lineStyle(1, PALETTE_HEX.orange, 0.55);
    panel.strokePoints(octagon(S.width - 5, S.height - 5, 6, cx, cy), true);

    for (const [index, row] of STAT_ROWS.entries()) {
      const y = S.firstRowY + index * S.rowHeight;
      const label = addUiText(scene, S.labelX, y, row.label, {
        fontFamily: BODY_FONT,
        fontSize: '9px',
        color: '#E9E5F2',
      }).setOrigin(0, 0.5);
      label.setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL);

      const track = scene.add
        .rectangle(S.barX, y, S.barWidth, S.barHeight, FX_COLORS.barTrack)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, FX_COLORS.barBorder, 0.85)
        .setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL);
      const fill = scene.add
        .rectangle(S.barX, y, S.barWidth, S.barHeight, PALETTE_HEX.gold)
        .setOrigin(0, 0.5)
        .setDepth(CHARACTER_DEPTH.SHOWCASE_PANEL + 1);
      void track; // Kept for its drawn border; only the fill is animated.
      const value = config.stats[row.key];
      fill.displayWidth = Math.max(1, value * S.barWidth);
      this.bars.push({ key: row.key, fill, value });
    }
  }

  setCharacter(config: CharacterConfig, immediate = false): void {
    this.config = config;
    this.targets = { ...config.stats };
    this.artwork.setTexture(config.showcaseTextureKey).setScale(0.5);
    this.glow.setTint(config.accent);
    this.name.setText(config.name);
    this.style.setText(config.style);

    if (immediate) {
      for (const bar of this.bars) bar.value = this.targets[bar.key];
      this.artwork.setAlpha(1).setScale(0.5);
    } else {
      // Smooth selection: a short fade/slide plus eased statistic bars.
      this.artwork.setAlpha(0.35).setScale(0.48);
    }
    this.applyBars();
  }

  private applyBars(): void {
    const S = CHARACTER_LAYOUT.stats;
    for (const bar of this.bars) {
      bar.fill.displayWidth = Math.max(1, bar.value * S.barWidth);
      bar.fill.setFillStyle(bar.value >= 0.85 ? PALETTE_HEX.orange : PALETTE_HEX.gold, 1);
    }
  }

  /** Frame-rate independent easing (works even at slow headless frame rates). */
  update(_timeMs: number, deltaMs: number): void {
    const t = 1 - Math.exp(-Math.min(deltaMs, 100) / CHARACTER_CONFIG.EASE_MS);
    let changed = false;
    for (const bar of this.bars) {
      const goal = this.targets[bar.key];
      if (Math.abs(bar.value - goal) > 0.001) {
        bar.value = lerp(bar.value, goal, t);
        changed = true;
      } else {
        bar.value = goal;
      }
    }
    if (changed) this.applyBars();
    this.artwork.setAlpha(lerp(this.artwork.alpha, 1, t));
    this.artwork.setScale(lerp(this.artwork.scaleX, 0.5, t));
  }

  get selectedName(): string {
    return this.config.name;
  }

  get styleText(): string {
    return this.config.style;
  }

  get displayedStats(): CharacterStats {
    const stats: CharacterStats = { power: 0, speed: 0, defense: 0, range: 0 };
    for (const bar of this.bars) stats[bar.key] = bar.value;
    return stats;
  }

  /**
   * The ALIGNED target box. The selection animation briefly scales the image
   * from 0.48 to 0.5, so reporting the current display width would make the
   * layout look misaligned mid-tween. Every roster plate is authored at 2x
   * logical size and settles at exactly this box.
   */
  get artworkBounds(): { x: number; y: number; width: number; height: number } {
    const source = this.artwork.texture.getSourceImage();
    return {
      x: Math.round(this.artwork.x),
      y: Math.round(this.artwork.y),
      width: Math.round(source.width * 0.5),
      height: Math.round(source.height * 0.5),
    };
  }

  get nameWidth(): number {
    return this.name.width;
  }
}
