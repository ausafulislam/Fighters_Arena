import Phaser from 'phaser';

import { fighterSheetTextureKey } from '@/constants/assets';
import {
  ATTACKS,
  ATTACK_DURATION,
  MATCH_CONFIG,
  MATCH_DEPTH,
  attackPhase,
} from '@/constants/match';
import {
  createFighterAnimations,
  fighterIdleFrame,
  playFighterState,
} from '@/game/animations/FighterAnimator';
import { playSfx, playSfxFile } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import type { CharacterConfig } from '@/types/characters';
import type { AttackName, AttackRuntime, FighterSnapshot, FighterState } from '@/types/match';
import type { FighterCommand, InputFrame } from '@/types/input';

const C = MATCH_CONFIG;

/**
 * A playable fighter: physics, state machine and frame-based animation. The
 * sprite sheet is real multi-frame art (see assets_work/process_phase6_assets.py);
 * a fighter is never a single static PNG moved around the screen.
 */
export class Fighter {
  readonly config: CharacterConfig;
  readonly side: 'player' | 'opponent';
  readonly sprite: Phaser.GameObjects.Sprite;

  x: number;
  y: number = C.GROUND_Y;
  vx = 0;
  vy = 0;
  facing: 1 | -1;
  health: number = C.MAX_HEALTH;
  energy = 0;
  grounded = true;
  blocking = false;
  crouching = false;
  state: FighterState = 'idle';
  attack: AttackRuntime | null = null;

  hitstunMs = 0;
  knockbackMs = 0;
  knockdownMs = 0;
  getupMs = 0;
  cooldownMs = 0;
  combo = 0;
  comboTimerMs = 0;
  jumpCount = 0;
  specialCount = 0;
  blockedCount = 0;

  private landTimerMs = 0;
  private previousCommand: FighterCommand | null = null;

  constructor(
    scene: Phaser.Scene,
    config: CharacterConfig,
    side: 'player' | 'opponent',
    x: number,
    facing: 1 | -1,
  ) {
    this.config = config;
    this.side = side;
    this.x = x;
    this.facing = facing;
    createFighterAnimations(scene, config.id);
    this.sprite = scene.add
      .sprite(x, C.GROUND_Y, fighterSheetTextureKey(config.id), fighterIdleFrame())
      .setOrigin(0.5, 1)
      .setDisplaySize(C.FIGHTER_HEIGHT * 0.93, C.FIGHTER_HEIGHT)
      .setDepth(MATCH_DEPTH.FIGHTERS)
      .setFlipX(facing === -1);
    playFighterState(this.sprite, config.id, 'idle', true);
  }

  /** Full reset for a new round / rematch without recreating the sprite. */
  reset(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = C.GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = C.MAX_HEALTH;
    this.energy = 0;
    this.grounded = true;
    this.blocking = false;
    this.crouching = false;
    this.state = 'idle';
    this.attack = null;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.knockdownMs = 0;
    this.getupMs = 0;
    this.cooldownMs = 0;
    this.combo = 0;
    this.comboTimerMs = 0;
    this.landTimerMs = 0;
    this.previousCommand = null;
    playFighterState(this.sprite, this.config.id, 'idle', true);
  }

  get alive(): boolean {
    return this.health > 0;
  }

  /** Body box used for real hit detection (shrinks while crouching). */
  get bodyBox(): Phaser.Geom.Rectangle {
    const height = this.crouching ? C.FIGHTER_HEIGHT * 0.62 : C.FIGHTER_HEIGHT * 0.94;
    return new Phaser.Geom.Rectangle(
      this.x - C.FIGHTER_WIDTH / 2,
      this.y - height,
      C.FIGHTER_WIDTH,
      height,
    );
  }

  /** Only the ACTIVE window of an attack produces a hitbox. */
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    if (!this.attack || this.attack.hasHit || this.attack.phase !== 'active') return null;
    const a = ATTACKS[this.attack.name];
    const centerX = this.x + this.facing * (C.FIGHTER_WIDTH / 2 + a.reach / 2);
    return new Phaser.Geom.Rectangle(
      centerX - a.width / 2,
      this.y - a.centerY - a.height / 2,
      a.width,
      a.height,
    );
  }

  /** Apply a resolved hit. Returns the damage actually dealt. */
  applyHit(
    damage: number,
    knockback: number,
    hitstunMs: number,
    sourceFacing: 1 | -1,
    blocked: boolean,
  ): number {
    const dealt = Math.max(0, damage);
    this.health = Math.max(0, this.health - dealt);
    this.energy = Math.min(C.SPECIAL_MAX, this.energy + (blocked ? 5 : C.ENERGY_ON_TAKING_HIT));
    if (blocked) this.blockedCount += 1;
    this.attack = null;
    this.combo = 0;
    this.comboTimerMs = 0;

    if (blocked) {
      this.hitstunMs = hitstunMs * 0.35;
      this.vx = knockback * 0.3 * sourceFacing;
      this.state = 'block';
    } else {
      this.hitstunMs = hitstunMs;
      this.knockbackMs = hitstunMs * 0.55;
      this.vx = knockback * sourceFacing;
      this.state = 'knockback';
    }
    if (!this.alive) {
      this.startKnockdown();
      this.state = 'knockdown';
    }
    return dealt;
  }

  registerHit(): void {
    if (!this.attack) return;
    this.combo += 1;
    this.comboTimerMs = C.COMBO_WINDOW_MS;
    const a = ATTACKS[this.attack.name];
    this.energy = Math.min(C.SPECIAL_MAX, this.energy + a.energyGain + C.ENERGY_ON_HIT);
  }

  private startKnockdown(): void {
    this.knockdownMs = C.KNOCKDOWN_MS;
    this.getupMs = C.GETUP_MS;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.attack = null;
  }

  /** Keep the two fighters from walking through each other. */
  separateFrom(other: Fighter): void {
    const delta = other.x - this.x;
    const distance = Math.abs(delta);
    if (distance >= C.MIN_DISTANCE) return;
    const direction = delta === 0 ? (this.side === 'player' ? 1 : -1) : Math.sign(delta);
    const overlap = (C.MIN_DISTANCE - distance) / 2;
    this.x -= direction * overlap;
    other.x += direction * overlap;
    this.clampX();
    other.clampX();
  }

  private clampX(): void {
    this.x = Phaser.Math.Clamp(
      this.x,
      C.ARENA_LEFT + C.FIGHTER_WIDTH / 2,
      C.ARENA_RIGHT - C.FIGHTER_WIDTH / 2,
    );
  }

  update(dtMs: number, frame: InputFrame, opponent: Fighter): void {
    const dt = dtMs / 1000;
    this.previousCommand = frame.held;
    if (this.cooldownMs > 0) this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    if (this.comboTimerMs > 0) {
      this.comboTimerMs -= dtMs;
      if (this.comboTimerMs <= 0) this.combo = 0;
    }
    this.facing = opponent.x >= this.x ? 1 : -1;

    if (this.knockdownMs > 0) {
      this.knockdownMs -= dtMs;
      this.state = 'knockdown';
      this.vx *= 0.9;
      if (this.knockdownMs <= 0) {
        this.knockdownMs = 0;
        this.state = 'getup';
      }
    } else if (this.getupMs > 0) {
      this.getupMs -= dtMs;
      this.state = 'getup';
      if (this.getupMs <= 0) {
        this.getupMs = 0;
        this.state = 'idle';
      }
    } else if (this.hitstunMs > 0) {
      this.hitstunMs -= dtMs;
      this.knockbackMs = Math.max(0, this.knockbackMs - dtMs);
      this.state = this.knockbackMs > 0 ? 'knockback' : 'hit';
      if (this.hitstunMs <= 0) this.state = 'idle';
    } else if (this.attack) {
      this.advanceAttack(dtMs);
    } else {
      this.handleInput(frame);
    }

    // Gravity + ground detection.
    if (!this.grounded) {
      this.vy += C.GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= C.GROUND_Y) {
        this.y = C.GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        if (!this.hitstunMs && !this.knockdownMs && !this.getupMs) {
          this.landTimerMs = 110;
          this.state = 'land';
        }
      }
    }

    this.x += this.vx * dt;
    this.vx *= Math.pow(0.0009, dt); // frame-rate independent horizontal drag
    if (Math.abs(this.vx) < 1) this.vx = 0;
    this.clampX();

    if (this.landTimerMs > 0) {
      this.landTimerMs -= dtMs;
      if (this.landTimerMs <= 0 && this.state === 'land') this.state = 'idle';
    }

    this.sprite.setPosition(Math.round(this.x), Math.round(this.y));
    this.sprite.setFlipX(this.facing === -1);
    playFighterState(this.sprite, this.config.id, this.state);
  }

  private advanceAttack(dtMs: number): void {
    const runtime = this.attack;
    if (!runtime) return;
    runtime.elapsedMs += dtMs;
    runtime.phase = attackPhase(runtime);
    const total = ATTACK_DURATION(runtime.name);
    if (runtime.elapsedMs >= total) {
      this.cooldownMs = ATTACKS[runtime.name].cooldownMs;
      this.attack = null;
      this.state = 'idle';
    }
  }

  private handleInput(frame: InputFrame): void {
    const { held, pressed } = frame;
    this.blocking = false;
    this.crouching = false;

    if (!this.grounded) {
      // Air control is limited; the jump animation owns the state.
      if (held.left) this.vx = -C.BACK_SPEED * 0.7;
      else if (held.right) this.vx = C.BACK_SPEED * 0.7;
      return;
    }

    if (pressed.special && this.energy >= C.SPECIAL_COST && this.cooldownMs === 0) {
      this.startAttack('special');
      return;
    }
    if (pressed.heavy_punch && this.cooldownMs === 0) {
      this.startAttack('heavy_punch');
      return;
    }
    if (pressed.kick && this.cooldownMs === 0) {
      this.startAttack('kick');
      return;
    }
    if (pressed.light_punch && this.cooldownMs === 0) {
      this.startAttack('light_punch');
      return;
    }
    if (this.cooldownMs > 0) {
      this.state = 'idle';
      this.vx = 0;
      return;
    }

    if (held.block) {
      this.blocking = true;
      this.state = 'block';
      this.vx = 0;
      return;
    }
    if (held.down) {
      this.crouching = true;
      this.state = 'crouch';
      this.vx = 0;
      return;
    }
    if (pressed.up) {
      this.vy = C.JUMP_VELOCITY;
      this.grounded = false;
      this.state = 'jump';
      this.jumpCount += 1;
      playSfx(SFX.JUMP);
      return;
    }

    const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    if (direction === 0) {
      this.state = 'idle';
      this.vx = 0;
      return;
    }
    const forward = direction === this.facing;
    const speed = forward ? C.WALK_SPEED : C.BACK_SPEED;
    this.vx = direction * speed;
    this.state = forward && speed >= C.RUN_SPEED ? 'run' : 'walk';
  }

  private startAttack(name: AttackName): void {
    this.attack = { name, elapsedMs: 0, phase: 'startup', hasHit: false };
    this.state = name;
    this.vx = name === 'heavy_punch' || name === 'special' ? this.facing * 26 : 0;
    if (name === 'special') {
      this.energy = Math.max(0, this.energy - C.SPECIAL_COST);
      this.specialCount += 1;
    }
    playSfxFile(ATTACKS[name].sfx);
    playFighterState(this.sprite, this.config.id, name, true);
  }

  /** Freeze into a victory / defeat pose at the end of a round. */
  celebrate(victory: boolean): void {
    this.attack = null;
    this.vx = 0;
    this.vy = 0;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.knockdownMs = 0;
    this.getupMs = 0;
    this.state = victory ? 'victory' : 'defeat';
    playFighterState(this.sprite, this.config.id, this.state, true);
  }

  getSnapshot(): FighterSnapshot {
    return {
      id: this.config.id,
      name: this.config.name,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      vx: Math.round(this.vx),
      vy: Math.round(this.vy),
      health: this.health,
      energy: Math.round(this.energy),
      state: this.state,
      attack: this.attack?.name ?? null,
      facing: this.facing,
      grounded: this.grounded,
      blocking: this.blocking,
      combo: this.combo,
      frameIndex: Number(this.sprite.frame.name),
    };
  }

  get lastCommand(): FighterCommand | null {
    return this.previousCommand;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
