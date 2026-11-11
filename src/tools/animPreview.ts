import Phaser from 'phaser';

import {
  FIGHTER_ANIMATION_NAMES,
  FIGHTER_ANIMATIONS,
  FIGHTER_FRAME,
} from '@/constants/fighterFrames';
import { fighterSheetTextureKey, fighterSheetUrl } from '@/constants/assets';
import { CHARACTERS } from '@/constants/characters';
import { createFighterAnimations, fighterAnimKey } from '@/game/animations/FighterAnimator';
import type { FighterAnimationName } from '@/constants/fighterFrames';
import type { CharacterConfig } from '@/types/characters';

/**
 * Developer-only character animation preview / verification tool.
 *
 * Open /anim-preview.html on the Vite dev server. It loads the real sprite
 * sheets, registers the real Phaser `anims` from the same generated frame map
 * the game uses, and lets you step through every animation of all seven
 * fighters. Nothing here is a mock: the sprites are Phaser animated sprites.
 */

const W = 1280;
const H = 720;
const LABEL = { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' } as const;
const GOLD = '#FFC247';

class PreviewScene extends Phaser.Scene {
  private characterIndex = 0;
  private animationIndex = 0;
  private paused = false;
  private auto = false;
  private autoSeen = new Set<string>();
  private elapsedMs = 0;
  private sprite!: Phaser.GameObjects.Sprite;
  private roster: Phaser.GameObjects.Sprite[] = [];
  private title!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private frameText!: Phaser.GameObjects.Text;
  private keyText!: Phaser.GameObjects.Text;
  private listText!: Phaser.GameObjects.Text;

  constructor() {
    super('AnimationPreview');
  }

  preload(): void {
    for (const config of CHARACTERS) {
      this.load.spritesheet(fighterSheetTextureKey(config.id), fighterSheetUrl(config.id), {
        frameWidth: FIGHTER_FRAME.width,
        frameHeight: FIGHTER_FRAME.height,
      });
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101014');
    for (const config of CHARACTERS) createFighterAnimations(this, config.id);

    this.add.rectangle(W / 2, H / 2, W, H, 0x101014);
    this.add.rectangle(310, 330, 560, 560, 0x1b1b22).setStrokeStyle(2, 0xffc247, 0.5);
    this.add.rectangle(310, 585, 540, 4, 0xff5a00);
    this.add.rectangle(940, 330, 560, 560, 0x16161e).setStrokeStyle(2, 0x8b2be2, 0.5);

    this.title = this.add.text(30, 24, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: GOLD,
    });
    this.add.text(
      30,
      62,
      "FIGHTER'S ARENA  /  REAL PHASER ANIMATED SPRITES  /  112 FRAMES PER FIGHTER",
      { fontFamily: 'monospace', fontSize: '14px', color: '#9d9daa' },
    );

    this.sprite = this.add
      .sprite(310, 585, fighterSheetTextureKey(this.currentConfig().id))
      .setOrigin(0.5, 1)
      .setScale(3);

    this.detail = this.add.text(30, 626, '', LABEL);
    this.status = this.add.text(30, 662, '', { ...LABEL, color: GOLD });
    this.frameText = this.add.text(30, 690, '', { ...LABEL, fontSize: '12px', color: '#9d9daa' });
    this.keyText = this.add.text(670, 60, '', { ...LABEL, fontSize: '14px', color: '#9d9daa' });
    this.listText = this.add.text(670, 96, '', {
      ...LABEL,
      fontSize: '13px',
      lineSpacing: 2,
    });

    // Small roster strip: every fighter animates with its own idle anim.
    CHARACTERS.forEach((config, index) => {
      const x = 690 + index * 80;
      const small = this.add
        .sprite(x, 646, fighterSheetTextureKey(config.id))
        .setOrigin(0.5, 1)
        .setScale(0.55);
      small.play(fighterAnimKey(config.id, 'idle'), true);
      this.roster.push(small);
      this.add
        .text(x, 668, config.name.slice(0, 4), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#8d8d9a',
        })
        .setOrigin(0.5, 0);
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowLeft':
          this.selectAnimation(this.animationIndex - 1);
          break;
        case 'ArrowRight':
          this.selectAnimation(this.animationIndex + 1);
          break;
        case 'ArrowUp':
          this.selectCharacter(this.characterIndex - 1);
          break;
        case 'ArrowDown':
          this.selectCharacter(this.characterIndex + 1);
          break;
        case 'Space':
          this.paused = !this.paused;
          if (this.paused) this.sprite.anims.pause();
          else this.sprite.anims.resume();
          break;
        case 'KeyA':
          this.auto = !this.auto;
          this.autoSeen.clear();
          break;
        case 'KeyR':
          this.autoSeen.clear();
          this.selectAnimation(0);
          break;
        default:
          if (/^Digit[1-7]$/.test(event.code)) {
            this.selectCharacter(Number(event.code.slice(-1)) - 1);
          }
          break;
      }
    });

    this.selectCharacter(0);
    this.selectAnimation(0);
  }

  private currentConfig(): CharacterConfig {
    return CHARACTERS[this.characterIndex] ?? CHARACTERS[0]!;
  }

  private selectCharacter(index: number): void {
    this.characterIndex = Phaser.Math.Wrap(index, 0, CHARACTERS.length);
    const config = this.currentConfig();
    this.sprite.setTexture(fighterSheetTextureKey(config.id));
    this.title.setText(`${config.name}  —  ${config.style}`);
    this.playCurrent(true);
    this.publishInspector();
  }

  private selectAnimation(index: number): void {
    this.animationIndex = Phaser.Math.Wrap(index, 0, FIGHTER_ANIMATION_NAMES.length);
    this.playCurrent(true);
    this.publishInspector();
  }

  private playCurrent(force: boolean): void {
    const config = this.currentConfig();
    const name = FIGHTER_ANIMATION_NAMES[this.animationIndex] as FighterAnimationName;
    const key = fighterAnimKey(config.id, name);
    if (force || this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
    if (this.paused) this.sprite.anims.pause();
    this.autoSeen.add(`${config.id}:${name}`);
    const definition = FIGHTER_ANIMATIONS[name];
    this.detail.setText(
      `${name.toUpperCase()}   ${definition.frames.length} frames   ${definition.fps} fps   ` +
        `${definition.repeat === -1 ? 'LOOP' : 'ONE-SHOT'}   ${definition.durationMs} ms`,
    );
    this.keyText.setText(`frames [${definition.frames.join(', ')}]\n${definition.description}`);
    this.listText.setText(
      FIGHTER_ANIMATION_NAMES.map(
        (entry, index) =>
          `${index === this.animationIndex ? '▶' : ' '} ${String(index + 1).padStart(2, '0')}  ${entry.padEnd(16)} ${FIGHTER_ANIMATIONS[entry].frames.length}f`,
      ).join('\n'),
    );
  }

  /** Publish the inspection hook immediately on every state change too. */
  private publishInspector(): void {
    const config = this.currentConfig();
    const animName = FIGHTER_ANIMATION_NAMES[this.animationIndex] ?? 'idle';
    (window as unknown as { __ANIM_PREVIEW__?: Record<string, unknown> }).__ANIM_PREVIEW__ = {
      characterId: config.id,
      characterIndex: this.characterIndex,
      animation: animName,
      animationKey: fighterAnimKey(config.id, animName),
      sheetFrame: Number(this.sprite.anims.currentFrame?.frame.name ?? 0),
      playhead: this.sprite.anims.currentFrame?.index ?? 0,
      frameCount: FIGHTER_ANIMATIONS[animName].frames.length,
      isPlaying: this.sprite.anims.isPlaying,
      paused: this.paused,
      autoSeen: this.autoSeen.size,
      rosterCount: this.roster.length,
    };
  }

  update(_time: number, delta: number): void {
    const config = this.currentConfig();
    this.publishInspector();
    const name = FIGHTER_ANIMATION_NAMES[this.animationIndex] as FighterAnimationName;
    this.elapsedMs += delta;
    if (this.auto && !this.paused && this.elapsedMs > 900) {
      this.elapsedMs = 0;
      this.selectAnimation(this.animationIndex + 1);
    }
    const frame = this.sprite.anims.currentFrame;
    this.frameText.setText(
      `texture=${fighterSheetTextureKey(config.id)}  anim=${fighterAnimKey(config.id, name)}  ` +
        `sheetFrame=${frame?.frame.name ?? '-'}  playhead=${frame?.index ?? 0}  ` +
        `playing=${this.sprite.anims.isPlaying}`,
    );
    this.status.setText(
      `AUTO=${this.auto ? 'ON' : 'OFF'}  seen=${this.autoSeen.size}/${FIGHTER_ANIMATION_NAMES.length * CHARACTERS.length}  ` +
        `paused=${this.paused ? 'YES' : 'NO'}  roster=${this.roster.length}`,
    );
    for (let i = 0; i < this.roster.length; i += 1) {
      this.roster[i]?.setAlpha(i === this.characterIndex ? 1 : 0.5);
    }
  }
}

void new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: W,
  height: H,
  backgroundColor: '#101014',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  banner: false,
  scene: [PreviewScene],
});
