import Phaser from 'phaser';

import { ANIMATION_KEYS, FLAME_FRAME, TEXTURE_KEYS } from '@/constants/assets';
import { GAME_WIDTH } from '@/constants/game';
import { DEPTH, LOADING_LAYOUT } from '@/constants/loading';
import { FX_COLORS, PALETTE_HEX } from '@/constants/palette';
import { RUNTIME_TEXTURES } from '@/utils/textures';

interface CloudLayer {
  image: Phaser.GameObjects.Image;
  speed: number;
  baseAlpha: number;
}

interface GlowLayer {
  image: Phaser.GameObjects.Image;
  baseAlpha: number;
  phase: number;
}

interface FlameSprite {
  sprite: Phaser.GameObjects.Sprite;
  animationKey: string;
}

/** Night arena, moon halo, drifting clouds, coloured light pools and braziers. */
export class LoadingBackground {
  private readonly scene: Phaser.Scene;
  private clouds: CloudLayer[] = [];
  private glows: GlowLayer[] = [];
  private flames: FlameSprite[] = [];
  private readonly flameGroups = new Set<string>();
  private arena: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  revealArena(): void {
    if (this.arena || !this.scene.textures.exists(TEXTURE_KEYS.ARENA_NIGHT)) return;
    const { x, y } = LOADING_LAYOUT.background;
    this.arena = this.scene.add.image(x, y, TEXTURE_KEYS.ARENA_NIGHT).setDepth(DEPTH.BACKGROUND);
  }

  revealGlows(): void {
    if (this.glows.length > 0 || !this.scene.textures.exists(TEXTURE_KEYS.GLOW)) return;
    const specs = [
      { ...LOADING_LAYOUT.moonGlow, tint: FX_COLORS.moonGlow, alpha: 0.2, depth: DEPTH.MOON_GLOW },
      {
        ...LOADING_LAYOUT.leftGlow,
        tint: PALETTE_HEX.orange,
        alpha: 0.24,
        depth: DEPTH.LIGHT_POOLS,
      },
      {
        ...LOADING_LAYOUT.rightGlow,
        tint: FX_COLORS.violetGlow,
        alpha: 0.26,
        depth: DEPTH.LIGHT_POOLS,
      },
    ];
    specs.forEach((spec, index) => {
      const image = this.scene.add
        .image(spec.x, spec.y, TEXTURE_KEYS.GLOW)
        .setDisplaySize(spec.width, spec.height)
        .setTint(spec.tint)
        .setAlpha(spec.alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(spec.depth);
      this.glows.push({ image, baseAlpha: spec.alpha, phase: index * 1.7 });
    });
  }

  revealClouds(): void {
    if (this.clouds.length > 0 || !this.scene.textures.exists(TEXTURE_KEYS.CLOUD_BANK)) return;
    const frame = this.scene.textures.get(TEXTURE_KEYS.CLOUD_BANK).getSourceImage();
    const ratio = frame.width / frame.height;

    for (const spec of LOADING_LAYOUT.clouds) {
      const image = this.scene.add
        .image(spec.x, spec.y, TEXTURE_KEYS.CLOUD_BANK)
        .setDisplaySize(spec.width, spec.width / ratio)
        .setTint(FX_COLORS.cloudTint)
        .setAlpha(spec.alpha)
        .setDepth(DEPTH.CLOUDS);
      this.clouds.push({ image, speed: spec.speed, baseAlpha: spec.alpha });
    }
  }

  /** Reveal one flame sheet as soon as that file finishes loading. */
  revealFlames(key: string): void {
    const group =
      key === TEXTURE_KEYS.FLAMES_WARM
        ? {
            anim: ANIMATION_KEYS.FLAMES_WARM,
            positions: LOADING_LAYOUT.warmFlames,
            tint: PALETTE_HEX.orange,
          }
        : key === TEXTURE_KEYS.FLAMES_VIOLET
          ? {
              anim: ANIMATION_KEYS.FLAMES_VIOLET,
              positions: LOADING_LAYOUT.violetFlames,
              tint: FX_COLORS.violetGlow,
            }
          : null;

    if (!group || this.flameGroups.has(key) || !this.scene.textures.exists(key)) return;
    this.flameGroups.add(key);

    for (const pos of group.positions) {
      this.scene.add
        .image(pos.x, pos.y, RUNTIME_TEXTURES.SOFT_GLOW)
        .setDisplaySize(56, 42)
        .setTint(group.tint)
        .setAlpha(0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.FLAMES - 1);
      const sprite = this.scene.add.sprite(pos.x, pos.y, key, 0).setDepth(DEPTH.FLAMES);
      this.flames.push({ sprite, animationKey: group.anim });
    }
  }

  /** Called once all textures exist (scene create). */
  startAnimations(): void {
    const definitions = [
      { key: ANIMATION_KEYS.FLAMES_WARM, texture: TEXTURE_KEYS.FLAMES_WARM },
      { key: ANIMATION_KEYS.FLAMES_VIOLET, texture: TEXTURE_KEYS.FLAMES_VIOLET },
    ];
    for (const def of definitions) {
      if (this.scene.anims.exists(def.key) || !this.scene.textures.exists(def.texture)) continue;
      this.scene.anims.create({
        key: def.key,
        frames: this.scene.anims.generateFrameNumbers(def.texture, {
          start: 0,
          end: FLAME_FRAME.count - 1,
        }),
        frameRate: 9,
        repeat: -1,
      });
    }
    for (const flame of this.flames) {
      if (this.scene.anims.exists(flame.animationKey)) flame.sprite.play(flame.animationKey);
    }
  }

  update(timeMs: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const cloud of this.clouds) {
      const half = cloud.image.displayWidth / 2;
      cloud.image.x -= cloud.speed * dt;
      if (cloud.speed > 0 && cloud.image.x < -half) cloud.image.x = GAME_WIDTH + half;
      if (cloud.speed < 0 && cloud.image.x > GAME_WIDTH + half) cloud.image.x = -half;
      cloud.image.setAlpha(cloud.baseAlpha + Math.sin(timeMs * 0.0007 + cloud.speed) * 0.025);
    }
    for (const glow of this.glows) {
      glow.image.setAlpha(glow.baseAlpha + Math.sin(timeMs * 0.0011 + glow.phase) * 0.055);
    }
  }
}
