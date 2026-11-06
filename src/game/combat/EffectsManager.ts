import Phaser from 'phaser';

import { MATCH_CONFIG, MATCH_DEPTH } from '@/constants/match';
import { PALETTE_HEX } from '@/constants/palette';
import type { CombatHit } from '@/game/combat/CombatSystem';
import { MENU_FONT } from '@/utils/fonts';
import { addUiText } from '@/utils/typography';

interface Particle {
  image: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  lifeMs: number;
  maxMs: number;
  spin: number;
}

const TEXTURES = {
  SPARK: 'fx-overhaul-spark',
  SHARD: 'fx-overhaul-shard',
  RING: 'fx-overhaul-ring',
} as const;

/**
 * Controlled combat feedback: short pixel sparks, a single impact ring, damage
 * numbers, a brief flash on the defender, a combo badge and a very short camera
 * shake. Effects are deliberately small and short-lived so they never hide the
 * character animations. All objects are pooled/tracked and destroyed on exit.
 */
export class EffectsManager {
  private readonly scene: Phaser.Scene;
  private readonly particles: Particle[] = [];
  private readonly floating: Phaser.GameObjects.Text[] = [];
  private comboText: Phaser.GameObjects.Text;
  private comboTimerMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTextures();
    this.comboText = addUiText(scene, 320, 92, '', {
      fontFamily: MENU_FONT,
      fontSize: '13px',
      color: '#FFC247',
      stroke: '#101014',
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS + 2)
      .setAlpha(0);
  }

  private createTextures(): void {
    const g = this.scene.add.graphics().setVisible(false);
    // 8x8 four-point spark.
    g.clear().fillStyle(0xffffff, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(4, 0),
        new Phaser.Geom.Point(5, 3),
        new Phaser.Geom.Point(8, 4),
        new Phaser.Geom.Point(5, 5),
        new Phaser.Geom.Point(4, 8),
        new Phaser.Geom.Point(3, 5),
        new Phaser.Geom.Point(0, 4),
        new Phaser.Geom.Point(3, 3),
      ],
      true,
    );
    g.generateTexture(TEXTURES.SPARK, 8, 8);
    // 4x4 shard.
    g.clear().fillStyle(0xffffff, 1).fillRect(1, 0, 2, 4).fillRect(0, 1, 4, 2);
    g.generateTexture(TEXTURES.SHARD, 4, 4);
    // 20x20 hollow ring.
    g.clear().lineStyle(2, 0xffffff, 1).strokeCircle(10, 10, 8);
    g.generateTexture(TEXTURES.RING, 20, 20);
    g.destroy();
  }

  onHit(hit: CombatHit): void {
    const color = hit.blocked ? PALETTE_HEX.gold : PALETTE_HEX.orange;
    const count = hit.blocked ? 5 : hit.heavy ? 11 : 7;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.28;
      const speed = 42 + (i % 4) * 24 + (hit.heavy ? 20 : 0);
      const texture = i % 3 === 0 ? TEXTURES.SHARD : TEXTURES.SPARK;
      const image = this.scene.add
        .image(hit.x, hit.y, texture)
        .setTint(i % 4 === 0 ? PALETTE_HEX.white : color)
        .setDepth(MATCH_DEPTH.EFFECTS + 1)
        .setScale(i % 2 === 0 ? 1 : 0.7);
      this.particles.push({
        image,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        lifeMs: 220 + (i % 3) * 60,
        maxMs: 220 + (i % 3) * 60,
        spin: (i % 2 ? 1 : -1) * 5,
      });
    }

    const ring = this.scene.add
      .image(hit.x, hit.y, TEXTURES.RING)
      .setTint(color)
      .setDepth(MATCH_DEPTH.EFFECTS)
      .setScale(hit.blocked ? 0.6 : 0.9)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale: hit.blocked ? 1.25 : 2.1,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });

    if (!hit.blocked) {
      this.damageNumber(hit);
      this.flash(hit.defender);
    }
    if (hit.combo > 1) {
      this.comboText.setText(`${hit.combo} HIT COMBO`).setAlpha(1).setScale(1);
      this.comboTimerMs = 900;
    }
    this.scene.cameras.main.shake(
      hit.blocked
        ? MATCH_CONFIG.SHAKE_LIGHT_MS
        : hit.heavy
          ? MATCH_CONFIG.SHAKE_HEAVY_MS
          : MATCH_CONFIG.SHAKE_LIGHT_MS,
      MATCH_CONFIG.SHAKE_INTENSITY * (hit.heavy ? 1.5 : 1),
    );
  }

  private damageNumber(hit: CombatHit): void {
    const text = addUiText(this.scene, hit.x, hit.y - 18, `-${hit.damage}`, {
      fontFamily: MENU_FONT,
      fontSize: hit.heavy ? '15px' : '12px',
      color: hit.attack === 'special' ? '#FFC247' : '#FFFFFF',
      stroke: '#101014',
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS + 3);
    this.floating.push(text);
    this.scene.tweens.add({
      targets: text,
      y: hit.y - 42,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const index = this.floating.indexOf(text);
        if (index >= 0) this.floating.splice(index, 1);
        text.destroy();
      },
    });
  }

  private flash(defender: CombatHit['defender']): void {
    const sprite = defender.sprite;
    sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  /** A short, readable announcement for a round result. */
  roundBanner(text: string, color = '#FFC247'): void {
    const banner = addUiText(this.scene, 320, 140, text, {
      fontFamily: MENU_FONT,
      fontSize: '30px',
      color,
      stroke: '#101014',
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setDepth(MATCH_DEPTH.EFFECTS + 4)
      .setScale(0.8);
    this.scene.tweens.add({
      targets: banner,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 850,
      duration: 300,
      onComplete: () => banner.destroy(),
    });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      if (!p) continue;
      p.lifeMs -= dtMs;
      if (p.lifeMs <= 0) {
        p.image.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      p.image.x += p.vx * dt;
      p.image.y += p.vy * dt;
      p.vy += 260 * dt;
      p.image.rotation += p.spin * dt;
      p.image.setAlpha(Math.min(1, p.lifeMs / (p.maxMs * 0.5)));
    }
    if (this.comboTimerMs > 0) {
      this.comboTimerMs -= dtMs;
      if (this.comboTimerMs <= 0) this.comboText.setAlpha(0);
    }
  }

  get particleCount(): number {
    return this.particles.length;
  }

  get effectCount(): number {
    return this.particles.length + this.floating.length + 1;
  }

  destroy(): void {
    for (const p of this.particles) p.image.destroy();
    this.particles.length = 0;
    for (const text of this.floating) text.destroy();
    this.floating.length = 0;
    this.comboText.destroy();
    for (const key of Object.values(TEXTURES)) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
  }
}
