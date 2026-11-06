import type Phaser from 'phaser';

import { ARENA_AMBIENCE, type ArenaAmbienceConfig } from '@/constants/arenas';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { MATCH_CONFIG, MATCH_DEPTH } from '@/constants/match';
import type { ArenaId } from '@/types/arenas';

interface Mote {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  sway: number;
  phase: number;
  drift: number;
}

interface Lantern {
  core: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  phase: number;
}

const DEPTH = {
  CLOUDS: MATCH_DEPTH.AMBIENT - 1.4,
  LANTERN_GLOW: MATCH_DEPTH.AMBIENT - 0.6,
  PARTICLES: MATCH_DEPTH.AMBIENT,
  LANTERNS: MATCH_DEPTH.AMBIENT + 0.4,
  GROUND: MATCH_DEPTH.FLOOR_GLOW + 0.5,
} as const;

const TEX = {
  CLOUD: 'fx-amb-cloud',
  GLOW: 'fx-amb-glow',
  LANTERN: 'fx-amb-lantern',
  PETAL: 'fx-amb-petal',
  EMBER: 'fx-amb-ember',
  LEAF: 'fx-amb-leaf',
  SNOW: 'fx-amb-snow',
  RAIN: 'fx-amb-rain',
  MOTE: 'fx-amb-mote',
} as const;

/**
 * Layered pixel-art environment motion: a far parallax cloud/mist bank,
 * flickering lanterns/neon lights, mid-depth falling petals / embers / leaves /
 * snow / rain, and low ground motes. Every layer renders behind the fighters,
 * wraps without popping, and is driven by a single small update loop.
 */
export class ArenaAmbience {
  private readonly scene: Phaser.Scene;
  private readonly config: ArenaAmbienceConfig;
  private readonly motes: Mote[] = [];
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly lanterns: Lantern[] = [];
  private readonly ground: Phaser.GameObjects.Image[] = [];
  private elapsed = 0;

  constructor(scene: Phaser.Scene, arenaId: ArenaId) {
    this.scene = scene;
    this.config = ARENA_AMBIENCE[arenaId] ?? ARENA_AMBIENCE.temple_grounds;
    this.createTextures();
    this.createClouds();
    this.createLanterns();
    this.createParticles();
    this.createGroundMotes();
  }

  private createTextures(): void {
    const g = this.scene.add.graphics().setVisible(false);
    // Soft pixel cloud bank: three overlapping rounded pixel bands.
    g.clear().fillStyle(0xffffff, 0.16);
    g.fillRect(0, 8, 96, 10);
    g.fillRect(10, 4, 70, 16);
    g.fillRect(24, 0, 44, 22);
    g.fillStyle(0xffffff, 0.1);
    g.fillRect(6, 12, 84, 8);
    g.generateTexture(TEX.CLOUD, 96, 24);

    // Radial-ish pixel glow (concentric squares).
    for (let i = 0; i < 5; i += 1) {
      const inset = i * 3;
      g.clear().fillStyle(0xffffff, 0.05 + i * 0.035);
      g.fillRect(inset, inset, 32 - inset * 2, 32 - inset * 2);
      if (i === 4) g.generateTexture(TEX.GLOW, 32, 32);
    }

    // Lantern body.
    g.clear().fillStyle(0xffffff, 1).fillRect(1, 0, 6, 9);
    g.fillStyle(0x000000, 0.35).fillRect(2, 2, 4, 5);
    g.generateTexture(TEX.LANTERN, 8, 9);

    const shapes: Record<string, () => void> = {
      [TEX.PETAL]: () =>
        g
          .clear()
          .fillStyle(0xffffff, 1)
          .fillRect(1, 0, 3, 2)
          .fillRect(0, 1, 5, 2)
          .fillRect(1, 3, 3, 1),
      [TEX.EMBER]: () => g.clear().fillStyle(0xffffff, 1).fillRect(1, 0, 2, 3).fillRect(0, 1, 4, 2),
      [TEX.LEAF]: () =>
        g
          .clear()
          .fillStyle(0xffffff, 1)
          .fillRect(1, 0, 4, 2)
          .fillRect(0, 2, 5, 2)
          .fillRect(2, 4, 2, 1),
      [TEX.SNOW]: () => g.clear().fillStyle(0xffffff, 1).fillRect(1, 1, 2, 2),
      [TEX.RAIN]: () => g.clear().fillStyle(0xffffff, 1).fillRect(1, 0, 1, 6),
      [TEX.MOTE]: () => g.clear().fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2),
    };
    for (const [key, draw] of Object.entries(shapes)) {
      draw();
      g.generateTexture(
        key,
        key === TEX.RAIN ? 3 : key === TEX.SNOW ? 4 : 6,
        key === TEX.RAIN ? 6 : 5,
      );
    }
    g.destroy();
  }

  private particleTexture(): string {
    switch (this.config.particle) {
      case 'ember':
        return TEX.EMBER;
      case 'leaf':
        return TEX.LEAF;
      case 'snow':
        return TEX.SNOW;
      case 'rain':
        return TEX.RAIN;
      default:
        return TEX.PETAL;
    }
  }

  private createClouds(): void {
    for (let i = 0; i < this.config.clouds; i += 1) {
      const image = this.scene.add
        .image(40 + i * 210, 40 + (i % 3) * 26, TEX.CLOUD)
        .setTint(this.config.cloudColor)
        .setAlpha(0.22 + (i % 3) * 0.05)
        .setScale(1.6 + (i % 2) * 0.8, 1 + (i % 3) * 0.3)
        .setDepth(DEPTH.CLOUDS);
      this.clouds.push(image);
    }
  }

  private createLanterns(): void {
    for (let i = 0; i < this.config.lanterns; i += 1) {
      const x = 54 + ((i * 128) % 532);
      const y = 96 + (i % 2) * 26;
      const glow = this.scene.add
        .image(x, y, TEX.GLOW)
        .setTint(this.config.lanternColor)
        .setAlpha(0.22)
        .setScale(1.6)
        .setDepth(DEPTH.LANTERN_GLOW);
      const core = this.scene.add
        .image(x, y, TEX.LANTERN)
        .setTint(this.config.lanternColor)
        .setAlpha(0.9)
        .setScale(1.4)
        .setDepth(DEPTH.LANTERNS);
      this.lanterns.push({ core, glow, phase: i * 1.7 });
    }
  }

  private createParticles(): void {
    const texture = this.particleTexture();
    const rain = this.config.particle === 'rain';
    const ember = this.config.particle === 'ember';
    for (let i = 0; i < this.config.particleCount; i += 1) {
      const image = this.scene.add
        .image(0, 0, texture)
        .setTint(this.config.particleColor)
        .setAlpha(rain ? 0.35 : 0.4 + (i % 4) * 0.13)
        .setDepth(DEPTH.PARTICLES)
        .setScale(rain ? 1 : 0.8 + (i % 3) * 0.2);
      this.motes.push({
        image,
        x: (i * 71) % GAME_WIDTH,
        y: (i * 53) % (rain ? GAME_HEIGHT : 240),
        speed: (ember ? -1 : 1) * (this.config.particleSpeed + (i % 5) * 2),
        sway: this.config.particleSway,
        phase: i * 0.73,
        drift: rain ? -12 : (i % 2 ? 1 : -1) * (3 + (i % 4)),
      });
    }
  }

  private createGroundMotes(): void {
    for (let i = 0; i < this.config.groundMotes; i += 1) {
      const image = this.scene.add
        .image(0, 0, TEX.MOTE)
        .setTint(this.config.particleColor)
        .setAlpha(0.25)
        .setDepth(DEPTH.GROUND);
      image.setPosition(30 + i * 96, MATCH_CONFIG.GROUND_Y - 4 - (i % 3) * 3);
      this.ground.push(image);
    }
  }

  update(timeMs: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.elapsed += dt;
    for (const cloud of this.clouds) {
      cloud.x += this.config.cloudSpeed * dt;
      if (cloud.x > GAME_WIDTH + 100) cloud.x = -100;
    }
    for (const light of this.lanterns) {
      const flicker =
        0.78 +
        Math.sin(this.elapsed * 5.5 + light.phase) * 0.12 +
        Math.sin(this.elapsed * 13 + light.phase * 2) * 0.06;
      light.core.setAlpha(flicker);
      light.glow.setAlpha(0.16 + flicker * 0.12);
    }
    for (const mote of this.motes) {
      mote.y += mote.speed * dt;
      mote.x += (mote.drift + Math.sin(this.elapsed * 1.6 + mote.phase) * mote.sway) * dt;
      if (mote.y > GAME_HEIGHT - 48) mote.y = mote.speed < 0 ? GAME_HEIGHT - 48 : -6;
      if (mote.y < -8) mote.y = -8;
      if (mote.x > GAME_WIDTH + 8) mote.x = -8;
      if (mote.x < -8) mote.x = GAME_WIDTH + 8;
      mote.image.setPosition(Math.round(mote.x), Math.round(mote.y));
      mote.image.rotation = Math.sin(this.elapsed + mote.phase) * 0.4;
    }
    for (let i = 0; i < this.ground.length; i += 1) {
      const image = this.ground[i];
      if (!image) continue;
      image.setAlpha(0.16 + 0.12 * (0.5 + 0.5 * Math.sin(timeMs / 700 + i)));
    }
  }

  get particleCount(): number {
    return this.motes.length;
  }

  get objectCount(): number {
    return this.motes.length + this.clouds.length + this.lanterns.length * 2 + this.ground.length;
  }

  destroy(): void {
    for (const mote of this.motes) mote.image.destroy();
    for (const cloud of this.clouds) cloud.destroy();
    for (const light of this.lanterns) {
      light.core.destroy();
      light.glow.destroy();
    }
    for (const image of this.ground) image.destroy();
    this.motes.length = 0;
    this.clouds.length = 0;
    this.lanterns.length = 0;
    this.ground.length = 0;
    for (const key of Object.values(TEX)) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
  }
}
